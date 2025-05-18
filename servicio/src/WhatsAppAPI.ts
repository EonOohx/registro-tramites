require("dotenv").config({ path: __dirname + "/.env" });

import {
  makeWASocket,
  downloadMediaMessage,
  proto,
  delay,
  WAMessageKey,
  WAMessageContent,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  AnyMessageContent,
  MessageUpsertType,
  BaileysEventMap,
  Browsers,
} from "@whiskeysockets/baileys";
import MAIN_LOGGER from "@whiskeysockets/baileys/lib/Utils/logger";
import { Boom } from "@hapi/boom";
import readline from "readline";
import { writeFile } from "fs/promises";
import NodeCache from "node-cache";
import axios from "axios";

export class WhatsAppAPI {
  private logger: any;
  private useMobile: boolean;
  private doReplies: boolean;
  private useStore: boolean;
  usePairingCode: boolean;
  msgRetryCounterCache: NodeCache;
  rl: readline.Interface;
  question: (text: string) => Promise<string>;
  store: any;
  private newMessage: any[] = [];
  // Id del grupo donde se capatarán los mensajes
  private idGroup: string = (process.env.ID_GROUPWPP ??= "");
  socketWpp: any;
  // Ruta donde se almacenarán los archivos descargados
  private ruta: string = (process.env.STORAGE_PATH ??= "");

  constructor() {
    this.logger = MAIN_LOGGER.child({});
    this.logger.level = "trace";

    this.useMobile = process.argv.includes("--mobile");
    this.doReplies = !process.argv.includes("--no-reply");
    this.useStore = !process.argv.includes("--no-store");
    this.usePairingCode = process.argv.includes("--use-pairing-code");

    this.msgRetryCounterCache = new NodeCache();

    // Read line interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.question = (text: string) =>
      new Promise<string>((resolve) => this.rl.question(text, resolve));

    this.store = this.useStore
      ? makeInMemoryStore({ logger: this.logger })
      : undefined;
    this.store?.readFromFile("./baileys_store_multi.json");

    // Guardar registros de la conexión cada 10s
    setInterval(() => {
      this.store?.writeToFile("./baileys_store_multi.json");
    }, 10_000);
  }

  async connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(
      "baileys_auth_info"
    );

    const sock = makeWASocket({
      mobile: this.useMobile,
      auth: {
        creds: state.creds,
        /** caching makes the store faster to send/recv messages */
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
      },
      msgRetryCounterCache: this.msgRetryCounterCache,
      printQRInTerminal: !this.usePairingCode,
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
      browser: Browsers.macOS("Desktop"),
    });

    this.store?.bind(sock.ev);

    // Conexión via navegador
    if (this.usePairingCode && !sock.authState.creds.registered) {
      if (this.useMobile) {
        throw new Error("Cannot use pairing code with mobile api");
      }

      const phoneNumber = await this.question(
        "Please enter your mobile phone number:\n"
      );
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`Pairing code: ${code}`);
    }

    // La función del proceso permite trabajar todos los eventos que están ocurriendo
    // eficientemente en un lote
    sock.ev.process(
      // evetns es un mapa para event name => event data
      async (events) => {
        // Eventos de Conexión (conexión cerrada, mensajes recibidos en offline o conexión abierta)
        this.sesionStatus(events, saveCreds);

        // Se recibió un nuevo mensaje
        if (events["messages.upsert"]) {
          const upsert = events["messages.upsert"];
          console.log("recv messages ", JSON.stringify(upsert, undefined, 2));
          if (upsert.messages[0].key.remoteJid == this.idGroup) {
            const m = upsert.messages[0];

            if (!m.message) return;
            const messageType = Object.keys(m.message)[0];
            if (messageType === "documentMessage") {
              const time = this.datetime();
              const file_name = `${time.replace(/[:\/\s\-\,]/g, "")}@` + (`${m.message?.documentMessage?.fileName}` || "default.pdf");
              const path_file = `${this.ruta}${file_name}`;
              this.newMessage = [
                { message: "Archivo descargado: " + path_file },
                { type: "documentMessage" },
                { info: this.structureFileInfo(m, path_file, file_name, time) },
              ];
              const response = await this.sender();
              if (response?.status === 200) {
                // Descargar documento
                await this.downloadMessage(m, sock, path_file);
                await this.sendMessageWTyping(
                  {
                    document: { url: path_file },
                    fileName: file_name,
                    mimetype: "application/pdf",
                  },
                  "document",
                  response.data.phone
                );
              }
            } else if (messageType === "conversation") {
              // Leer mensaje nuevo
              this.watchMessage(upsert.messages, upsert.type);
            }

            if (upsert.type === "notify") {
              for (const msg of upsert.messages) {
                if (!msg.key.fromMe && this.doReplies) {
                  console.log("replying to", msg.key.remoteJid);
                  await sock!.readMessages([msg.key]);
                }
              }
            }
          }
        }

        if (events["messages.reaction"]) {
          console.log(events["messages.reaction"]);
        }

        if (events["presence.update"]) {
          console.log(events["presence.update"]);
        }

        if (events["chats.update"]) {
          console.log(events["chats.update"]);
        }

        if (events["chats.delete"]) {
          console.log("chats deleted ", events["chats.delete"]);
        }
      }
    );
    this.socketWpp = sock;
    return sock;
  }

  async getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
    if (this.store) {
      const msg = await this.store.loadMessage(key.remoteJid!, key.id!);
      return msg?.message || undefined;
    }
    // Solo si está guardado en el almacenamiento
    return proto.Message.fromObject({});
  }

  async sendMessageWTyping(msg: AnyMessageContent, type: string, id?: string) {
    await this.socketWpp.presenceSubscribe(this.idGroup);
    await delay(500);

    await this.socketWpp.sendPresenceUpdate("composing", this.idGroup);
    await delay(2000);

    await this.socketWpp.sendPresenceUpdate("paused", this.idGroup);

    if (type === "text") await this.socketWpp.sendMessage(this.idGroup, msg);
    else if (type === "document") await this.socketWpp.sendMessage(id, msg);
  }

  public readMessage(): any[] {
    return this.newMessage;
  }

  private async downloadMessage(
    m: proto.IWebMessageInfo,
    sock: any,
    name: string
  ) {
    const buffer = await downloadMediaMessage(
      m,
      "buffer",
      {},
      {
        logger: this.logger,
        // Pasa esto para que baileys puede solicitar un recarga de medios eliminados
        reuploadRequest: sock.updateMediaMessage,
      }
    );
    await writeFile(name, buffer);
  }

  private structureFileInfo(
    m: proto.IWebMessageInfo,
    path: string,
    filename: string,
    time: string
  ): { [key: string]: any } {
    return {
      key: {
        participant: m.key.participant,
        pushName: m.pushName,
        remoteJid: m.key.remoteJid,
        id: m.key.id,
      },
      document: {
        document: path,
        name: filename,
        timestamp:time
      },
    };
  }

  private async watchMessage(
    messages: proto.IWebMessageInfo[],
    tp: MessageUpsertType
  ) {
    this.newMessage = messages
      .map((message) => JSON.parse(JSON.stringify(message)))
      .concat({ type: tp });
    this.sender();
  }

  private async sender() {
    try {
      const response = await axios.post(
        "http://localhost:3000/readMsg",
        this.newMessage
      );
      console.log("Información del mensaje enviada al webhook correctamente.");
      return response;
    } catch (error) {
      console.error(
        "Error al enviar la información del mensaje al webhook:",
        error
      );
    }
  }

  private async sesionStatus(
    events: Partial<BaileysEventMap>,
    saveCreds: () => Promise<void>
  ) {
    if (events["connection.update"]) {
      const update = events["connection.update"];
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        // reconnect if not logged out
        if (
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          this.connectToWhatsApp();
        } else {
          console.log("Connection closed. You are logged out.");
        }
      }

      console.log("connection update", update);
    }

    // credentials updated -- save them
    if (events["creds.update"]) {
      await saveCreds();
    }

    if (events["labels.association"]) {
      console.log(events["labels.association"]);
    }

    if (events["labels.edit"]) {
      console.log(events["labels.edit"]);
    }

    if (events.call) {
      console.log("recv call event", events.call);
    }

    // history received
    if (events["messaging-history.set"]) {
      const { chats, contacts, messages, isLatest } =
        events["messaging-history.set"];
      console.log(
        `recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest})`
      );
    }
  }

  private datetime(): string {
    const fecha = new Date(Date.now());
    const fechaMexico = fecha.toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
    });
    const [fechaParte1, horaParte2] = fechaMexico.split(" "); // Divide la fecha y la hora
    const [dia, mes, anio] = fechaParte1.split("/"); // Divide la parte de la fecha
    const [hora, minutos, segundos] = horaParte2.split(":"); // Divide la parte de la hora
    return `${anio}-${mes}-${dia} ${hora}:${minutos}:${segundos}`;
  }
}
