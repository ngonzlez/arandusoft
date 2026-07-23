import "server-only";
import { prisma } from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import { instanciaCsj } from "./client";
import { obtenerClienteCsj } from "./credenciales";
import { importarCaso } from "./importar";

export interface ResumenSyncCsj {
  cuentas: number;
  notificacionesNuevas: number;
  actuacionesNuevas: number;
  errores: string[];
}

type EmailFn = (to: string, asunto: string, html: string) => Promise<boolean>;

// Radar CSJ: por cada cuenta vinculada, trae notificaciones electrónicas nuevas
// (cédulas → disparan plazos) y re-sincroniza los casos con movimiento reciente
// para detectar actuaciones nuevas. Notifica in-app (+ email para las cédulas).
// Pensado para correr desde el cron diario. Tolerante a fallos por cuenta.
export async function sincronizarCsj(
  emailFn?: EmailFn,
  plantilla?: (titulo: string, cuerpo: string) => string
): Promise<ResumenSyncCsj> {
  const resumen: ResumenSyncCsj = {
    cuentas: 0,
    notificacionesNuevas: 0,
    actuacionesNuevas: 0,
    errores: [],
  };

  const creds = await prisma.credencialCsj.findMany({ where: { activo: true } });

  for (const cred of creds) {
    try {
      const csj = await obtenerClienteCsj(cred.userId);
      if (!csj) continue;
      resumen.cuentas++;

      // ── 1. Notificaciones electrónicas (cédulas) ──
      const notis = await csj.getNotificacionesPorRecibir().catch(() => []);
      for (const n of notis) {
        const cod = String(n.codNotificacionOrigen);
        const existe = await prisma.notificacionCsj.findUnique({
          where: { codNotificacionOrigen: cod },
          select: { id: true },
        });
        if (existe) continue; // dedupe

        const exp = await prisma.expediente.findFirst({
          where: { csjCasoId: String(n.codCasoJudicial) },
          select: { id: true, responsableId: true },
        });

        await prisma.notificacionCsj.create({
          data: {
            codNotificacionOrigen: cod,
            expedienteId: exp?.id ?? null,
            csjCasoId: String(n.codCasoJudicial),
            csjInstancia: n.origen != null ? instanciaCsj(n.origen, n.esCorte ?? 0) : null,
            caratula: n.caratula ?? null,
            despacho: n.descripcionDespacho ?? null,
            proceso: n.descripcionProcesoCaso ?? n.descripcionProceso ?? null,
            descripcion: n.descripcionTipoActuacion ?? null,
            fechaNotificacion: n.fechaNotificacion ? new Date(n.fechaNotificacion) : null,
            revisadoEnCsj: !!n.revisado,
            alertadoAt: new Date(),
          },
        });

        const userId = exp?.responsableId ?? cred.userId;
        const caratula = n.caratula ?? `Caso ${n.codCasoJudicial}`;
        const mensaje = `Nueva notificación electrónica: ${caratula}`;
        await crearNotificacion({
          userId,
          tipo: "EXPEDIENTE_ACTUALIZADO",
          mensaje,
          entidadTipo: exp ? "Expediente" : "NotificacionCsj",
          entidadId: exp?.id ?? cod,
        });

        if (emailFn && plantilla) {
          const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
          if (u?.email) {
            await emailFn(
              u.email,
              `Nueva cédula CSJ: ${caratula}`,
              plantilla(
                "Notificación electrónica recibida",
                `<p>${mensaje}</p><p>${n.descripcionDespacho ?? ""}</p><p>Ingresá al sistema para calcular el plazo.</p>`
              )
            );
          }
        }
        resumen.notificacionesNuevas++;
      }

      // ── 2. Actuaciones nuevas: re-sincronizar casos con movimiento reciente ──
      const resp = await csj.getUltimosDiezDias(0, 50).catch(() => null);
      for (const caso of resp?.resultado ?? []) {
        const exp = await prisma.expediente.findFirst({
          where: { csjCasoId: String(caso.codCasoJudicial), origenCsj: true },
          select: { id: true, responsableId: true },
        });
        if (!exp) continue; // solo casos ya importados

        const instancia = instanciaCsj(caso.origen, caso.esCorte);
        const r = await importarCaso(csj, {
          casoId: caso.codCasoJudicial,
          instancia,
          responsableId: exp.responsableId,
          listado: caso,
          traerDocumentos: false,
        });

        for (const na of r.actuacionesNuevas) {
          await crearNotificacion({
            userId: exp.responsableId,
            tipo: "EXPEDIENTE_ACTUALIZADO",
            mensaje: `Actuación nueva — ${caso.caratula}: ${na.descripcion}`,
            entidadTipo: "Expediente",
            entidadId: exp.id,
          });
          resumen.actuacionesNuevas++;
        }
      }

      await prisma.credencialCsj.update({
        where: { id: cred.id },
        data: { ultimoSync: new Date() },
      });
    } catch (e) {
      resumen.errores.push(`cuenta ${cred.userId}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return resumen;
}
