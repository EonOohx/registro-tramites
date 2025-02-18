import {
  clientRecord,
  insertCliente,
  insertSolicitud,
  insertUsuario,
  readCliente,
  readUsuario,
  requestRecord,
  userRecord,
} from "../models/mysqlmodels";
import { DanaoDB } from "./database";

export class DocsMessages {
  private pendingDocs: { [key: string]: any }[] = [];

  private tipoTramiteMap: { [key: string]: Number } = {
    curp: 1,
    comprobanteVigenciaDerechos: 3,
    recibo_cfe: 4,
    nac: 5,
    comprobantelocalizacion: 6,
  };

  private database: DanaoDB;

  private tipoTramite: Number = 7;

  constructor(db: DanaoDB) {
    this.database = db;
  }

  public async documentMessage(
    dataFile: any,
    dataUser: any
  ): Promise<
    | 400
    | {
        status: number;
        phone: string | undefined;
      }
  > {
    for (let key in this.tipoTramiteMap) {
      if (dataFile.name.toLowerCase().includes(key)) {
        console.log(this.tipoTramiteMap[key]);
        this.tipoTramite = this.tipoTramiteMap[key];
        break;
      } else {
        this.tipoTramite = 7;
      }
    }

    const result = this.pendingDocs.find((val) =>
      this.typeOfFile(dataFile.name, val)
    );
    if (result) dataFile.id_cliente = result.clientInfo.id_cliente;
    this.pendingDocs = this.pendingDocs.filter((item) => item !== result);
    return await this.DocMsgProcessing(dataFile, dataUser);
  }

  async DocMsgProcessing(
    dataFile: any,
    dataUser: any
  ): Promise<
    | 400
    | {
        status: number;
        phone: string | undefined;
      }
  > {
    // Objeto de Uusuario desde la Base de Datos
    let user = (
      await this.database.request(readUsuario, [
        dataUser.participant.split("@")[0],
      ])
    )[0][0];
    // Número a donde se enviará el documento
    const contact: string | undefined = process.env.CONTACT_NUMBER;
    if (!user) {
      await this.database.insert(insertUsuario, userRecord(dataUser));
      user = (
        await this.database.request(readUsuario, [
          dataUser.participant.split("@")[0],
        ])
      )[0][0];
    }

    dataFile.id_documento = this.tipoTramite;
    dataFile.id_usuario = user.id_usuario;
    const statusInsert = await this.database.insert(
      insertSolicitud,
      requestRecord(dataFile)
    );
    if (statusInsert) {
      //const rutaAbsoluta = path.resolve(__dirname, dataFile.document);
      return {
        status: 200,
        phone: contact,
      };
    }
    return 400;
  }

  // Identifica Peticiones e Información del Trámite
  public async messageIdentifier(message: string): Promise<boolean> {
    if (
      // INDENTIFICAR CURP
      message.length === 18 &&
      message === message.toUpperCase() &&
      /\d/.test(message)
    ) {
      const foundItem = this.pendingDocs.find(
        (item) => item.document === "curp"
      );
      if (foundItem) {
        await this.database.insert(
          insertCliente,
          clientRecord({ curp: message })
        );
        const clientInfo = (
          await this.database.request(readCliente, [message])
        )[0][0];
        clientInfo.identifier = message;
        foundItem.clientInfo = clientInfo;
        return true;
      } else return false;
    } else if (
      // PETICIÓN DE CURP
      message.toLowerCase().includes("curp") &&
      message.toLowerCase().includes("porfa")
    ) {
      this.pendingDocs.push({ document: "curp" });
      return true;
    }
    return false;
  }
  // Analiza Nombre del Archivo
  private typeOfFile(
    filename: string,
    record: { [key: string]: any }
  ): boolean {
    if (filename.includes("_")) {
      if (record.clientInfo) {
        const title =
          record.document.toUpperCase() + "_" + record.clientInfo.identifier;
        return filename.includes(title);
      }
    }
    return false;
  }
}
