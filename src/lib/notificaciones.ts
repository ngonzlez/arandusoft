import { TipoNotificacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Helper central: cada módulo crea notificaciones por acá.
// El envío de email asociado (según tipo) lo maneja el cron / cada módulo.
export async function crearNotificacion(params: {
  userId: string;
  tipo: TipoNotificacion;
  mensaje: string;
  entidadTipo?: string;
  entidadId?: string;
  emailEnviado?: boolean;
}) {
  return prisma.notificacion.create({
    data: {
      userId: params.userId,
      tipo: params.tipo,
      mensaje: params.mensaje,
      entidadTipo: params.entidadTipo,
      entidadId: params.entidadId,
      emailEnviado: params.emailEnviado ?? false,
    },
  });
}
