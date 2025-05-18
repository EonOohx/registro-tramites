export const insertUsuario =
  "INSERT INTO usuario (telefono_usuario, nombre_usuario) VALUES (?, ?);";

export const readUsuario =
  "SELECT id_usuario FROM usuario WHERE telefono_usuario = ?;";

export const readSolicitud =
  "SELECT d.tramite, s.id_usuario, s.fecha_documento FROM solicitud AS s INNER JOIN documento AS d ON s.id_documento = d.id_tramite WHERE fecha_documento BETWEEN ? AND ?;";

export const insertSolicitud =
  "INSERT INTO solicitud (id_documento, id_cliente, id_usuario, documento, nombre_documento, fecha_documento)" +
  "VALUES (?, ?, ?, ?, ?, ?);";

export const insertCliente =
  "INSERT INTO cliente (nombre_cliente, curp, fecha_nacimiento, telefono_cliente, email)" +
  "VALUES (?, ?, ?, ?, ?);";

export const readCliente =
  "SELECT id_cliente, telefono_cliente FROM cliente WHERE curp = ?;";

export function userRecord(data: any): any[] {
  const telefono_usuario = (data.participant.split("@")[0] ??= null);
  const nombre_usuario = (data.pushName ??= null);
  return [telefono_usuario, nombre_usuario];
}

export function clientRecord(data: any): any[] {
  const clientName = (data.name ??= null);
  const curp = (data.curp ??= null);
  const birthdate = (data.time ??= null);
  const clientTel = (data.tel ??= null);
  const email = (data.email ??= null);
  return [clientName, curp, birthdate, clientTel, email];
}

export function requestRecord(data: any): any[] {
  const id_documento = (data.id_documento ??= null);
  const id_cliente = (data.id_cliente ??= null);
  const id_usuario = (data.id_usuario ??= null);
  const document = (data.document ??= null);
  const nameDocument = (data.name ??= null);
  const requestDate = (data.timestamp ??= "");
  return [
    id_documento,
    id_cliente,
    id_usuario,
    document,
    nameDocument,
    requestDate,
  ];
}
