import {
  prop,
  getModelForClass,
  modelOptions,
  Ref,
  ReturnModelType,
  post,
} from "@typegoose/typegoose";

export
@modelOptions({
  schemaOptions: {
    timestamps: { createdAt: "creado", updatedAt: "actualizado" },
  },
})
class Usuario {
  @prop({ type: String, required: true })
  public _id!: string;

  @prop({ type: String, required: true })
  public rol: string;

  @prop({ type: String })
  public nombre: string;

  static async verifyAndUpdate(
    this: ReturnModelType<typeof Usuario>,
    id: string,
    pushName?: string
  ) {
    const datosUsuario = await this.findById(id, { nombre: 1 });
    if (datosUsuario?._id) {
      if (datosUsuario.$isEmpty("nombre") && pushName) {
        const res = await this.updateOne({ _id: id }, { nombre: pushName });
        console.log(`Archivos Modificados: ${res.modifiedCount}`);
      }
      return false;
    }
    return true;
  }
}

@modelOptions({
  schemaOptions: {
    timestamps: { createdAt: "creado", updatedAt: "actualizado" },
  },
})
class Envio {
  @prop({ type: String, required: true })
  public _id: string;

  @prop({ type: String, required: true, ref: () => Usuario })
  public id_remitente: Ref<Usuario>;

  @prop({ type: String, required: true, ref: () => Usuario })
  public id_destinatario: Ref<Usuario>;

  @prop({ type: String, required: true })
  public mensaje: string;

  @prop({ type: String, required: true })
  public tipo: string;
}

export const usuarioMg: ReturnModelType<typeof Usuario> =
  getModelForClass(Usuario);
export const envioMg = getModelForClass(Envio);
