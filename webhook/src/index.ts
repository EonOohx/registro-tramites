require("dotenv").config({ path: __dirname + "/.env" });
require("./danaomsgdb");

import express, { Application } from "express";
import { WhatsAppAPI } from "./WhatsAppAPI";
import io from "socket.io-client";
import { DocsMessages } from "./docsmessages";
import { saveConversation } from "./danaomsgdb";
import { DanaoDB } from "./database";
import { DataAlys } from "./dataanalysis";
import cors = require("cors");
import { createServer } from "node:http";
import { Server } from "socket.io";

let acceptableMessage: boolean;

// Puerto de la aplicación servidor:
const API_PORT = 3000;
const DATA_WEBHOOK_PORT = 3001;
const clientOrigin = {
  origin: "http://127.0.0.1:5000",
  methods: ["GET", "POST"],
};

// Inicializar conexiones
const app: Application = express();
app.use(cors());

//Socket Chart
const serverChart = createServer(app).listen(DATA_WEBHOOK_PORT, () => {
  console.log(`Server started on port ${DATA_WEBHOOK_PORT}`);
});
const socketChart = new Server(serverChart, {
  cors: clientOrigin,
});
// Puerto de la aplicación cliente:
const socketChat = io("http://127.0.0.1:5000");

const WppAPI = new WhatsAppAPI();
const db = new DanaoDB();
const msgClass = new DocsMessages(db);
const dataAnalysis = new DataAlys(db);

app.listen(API_PORT, () => {
  console.log(`Server is running on port ${API_PORT}`);
  WppAPI.connectToWhatsApp();
});

app.get("/", async (_req, res) => {
  res.send({
    message: `Server is running on port ${API_PORT}`,
  });
});

app.get("/getDataTramite", async (_req, res) => {
  const dataTramites = await dataAnalysis.fileData();
  dataTramites !== undefined
    ? res.json(dataTramites)
    : res.status(500).json("Ocurrió un error en el servidor");
});

// Middleware para analizar el cuerpo de la solicitud como JSON
app.use(express.json());
// Procesa Mensajes Nuevos; Genera Nuevos Registros DB
app.post("/readMsg", async (_req, res) => {
  console.log("Mensaje recibido desde WhatsApp:", _req.body);
  // Obteniendo el valor del tipo de mensaje
  const typeKey: string = _req.body[1].type;
  let msgData = _req.body[0];
  if (typeKey !== "append") {
    const message: string = _req.body[0].message.conversation;
    if (typeKey === "notify") {
      msgClass.messageIdentifier(message.trim());
      // Guardar Mensaje
      saveConversation(msgData.key, "notify", message, msgData.pushName);
      msgData = {
        Nombre: _req.body[0].pushName,
        Mensaje: message,
      };
      acceptableMessage = true;
    } else if (typeKey === "documentMessage") {
      const dataFile = _req.body[2].info.document;
      const dataUser = _req.body[2].info.key;
      const payload = await msgClass.documentMessage(dataFile, dataUser);
      if (payload !== undefined && payload !== 400) {
        res.status(200).send(payload);
        const chartpayload = await dataAnalysis.fileData()
        console.log(JSON.stringify(chartpayload))
        socketChart.emit(
          "setdata",
          chartpayload
        );
        acceptableMessage = true;
      } else res.status(500).send("Ocurrió un error en el servidor");
      // Guardar Mensaje
      saveConversation(dataUser, "documentMessage", dataFile.document);
    } else acceptableMessage = false;
    if (acceptableMessage) {
      socketChat.emit("message", msgData);
      console.log(res.statusCode);
    }
  }
});

//  Mensaje Desde la Aplicación Flask (Javascript)
socketChat.on("responseuser", (message: string) => {
  WppAPI.sendMessageWTyping({ text: message }, "text");
});

