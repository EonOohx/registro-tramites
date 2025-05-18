import { createPool } from "mysql2/promise";
require("dotenv").config({ path: __dirname + "/.env" });

export class DanaoDB {
  private conn: any;

  constructor() {
    try {
      this.connect();
    } catch (error) {
      console.log("Hubo error al conectarse a la base de datos: " + error);
    }
  }

  private async connect() {
    this.conn = createPool({
      host: "127.0.0.1",
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: "danao",
      connectionLimit: 10,
    });
  }

  async insert(query: string, values: any[]): Promise<boolean> {
    try {
      const [rows] = await this.conn.query(query, values);
      console.log("Registro insertado: ", rows);
      return true;
    } catch (error) {
      console.log("Hubo un error al insertar los datos: " + error);
      return false;
    }
  }

  async request(query: string, values: string[]): Promise<any> {
    try {
      const record = await this.conn.query(query, values);
      return record;
    } catch (error) {
      console.log("Hubo un error: " + error);
    }
  }
}
