import { readSolicitud } from "../models/mysqlmodels";
import { DanaoDB } from "./database";

export class DataAlys {
  private database: DanaoDB;

  constructor(db: DanaoDB) {
    this.database = db;
  }

  public async fileData() {
    //const fecha = new Date("April 01, 2024 00:00:00 GMT-6:00");
    const fecha = new Date();
    const diaHoy = fecha.getDay();
    const inicioSemana = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate() - (diaHoy - 1)
    );
    const finSemana = new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate() + (6 - diaHoy)
    );
    const dataRecord = await this.database.request(readSolicitud, [
      `${inicioSemana.getFullYear()}-${
        inicioSemana.getMonth() + 1
      }-${inicioSemana.getDate()}`,
      `${finSemana.getFullYear()}-${
        finSemana.getMonth() + 1
      }-${finSemana.getDate()}`,
    ]);
    return this.dataProcessing(dataRecord[0]);
  }

  private dataProcessing(dataRecord: any[]) {
    let typeFileNumbers: { [key: string]: number } = {
      CURP: 0,
      "Asignacion de NSS": 0,
      "Constancia de Vigencia de Derecho": 0,
      "Recibo de Luz": 0,
      "Acta de Nacimiento": 0,
      "Comprobante de Localizacion": 0,
      Otro: 0,
    };
    let weekday: { [key: string]: number } = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
    };
    dataRecord.map(function (record) {
      let day: string = new Date(record.fecha_documento)
        .toDateString()
        .split(" ")[0];
      weekday[day] += 1;
      typeFileNumbers[record.tramite] += 1;
    });
    return { weekday, typeFileNumbers };
  }
}
