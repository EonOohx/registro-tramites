require("dotenv").config({ path: __dirname + "/.env" });

import mongoose from "mongoose";
import { envioMg, Usuario, usuarioMg } from "../models/mongomodels";

mongoose
  .connect((process.env.MONGODB_HOST ??= ""))
  .then((_db) => console.log("Conexión mongo establecida"))
  .catch((err) => console.log(err));

export async function saveConversation(
  data: any,
  tipo: string,
  mensaje: string,
  nombre?: string
) {
  if (
    await usuarioMg.verifyAndUpdate(
      data.participant,
      (data.pushName ??= nombre)
    )
  ) {
    // Remitente
    (
      await usuarioMg.create({
        _id: data.participant,
        rol: "empleado",
        nombre: data.pushName,
      })
    ).save();
  }

  if (await usuarioMg.verifyAndUpdate(data.participant)) {
    // Destinatario
    (await usuarioMg.create({ _id: data.remoteJid, rol: "empleado" })).save();
  }

  // Destinatario
  //(await usuarioMg.create({ _id: data.remoteJid, rol: "empleado" })).save();
  // Mensaje
  (
    await envioMg.create({
      _id: data.id,
      id_remitente: data.participant,
      id_destinatario: data.remoteJid,
      tipo: tipo,
      mensaje: mensaje,
    })
  ).save();
}
