import { NextRequest, NextResponse } from "next/server";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import { getResend, EMAIL_FROM, plantillaEmail } from "@/lib/email";
import { formatFecha } from "@/lib/format";

// Cron diario (invocar 12:00 UTC = 08:00 Paraguay) con header x-cron-secret.
// 1) Alertas de vencimientos 7d / 3d / día-de  2) marcar vencidos
// 3) tareas vencidas  4) licencia por vencer → email al proveedor.

export const maxDuration = 60;

async function enviarEmailSeguro(to: string, asunto: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[cron] RESEND_API_KEY no configurada — email a ${to} omitido`);
    return false;
  }
  try {
    const res = await getResend().emails.send({ from: EMAIL_FROM, to, subject: asunto, html });
    return !res.error;
  } catch (e) {
    console.error("[cron] error enviando email:", e);
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET || !process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoy = new Date();
  const resumen = {
    alertas7d: 0,
    alertas3d: 0,
    alertasDia: 0,
    marcadosVencidos: 0,
    tareasVencidas: 0,
    licenciaAvisada: false,
  };

  // ── 1. Vencimientos pasados sin gestionar → VENCIDO ──
  const vencidos = await prisma.vencimiento.updateMany({
    where: { estado: "PENDIENTE", fechaVencimiento: { lt: startOfDay(hoy) } },
    data: { estado: "VENCIDO" },
  });
  resumen.marcadosVencidos = vencidos.count;

  // ── 2. Alertas por ventana ──
  const ventanas = [
    { dias: 7, flag: "notificado7d" as const, email: false },
    { dias: 3, flag: "notificado3d" as const, email: true },
    { dias: 0, flag: "notificadoDia" as const, email: true },
  ];

  for (const v of ventanas) {
    const objetivo = addDays(hoy, v.dias);
    const pendientes = await prisma.vencimiento.findMany({
      where: {
        estado: "PENDIENTE",
        [v.flag]: false,
        fechaVencimiento: { gte: startOfDay(objetivo), lte: endOfDay(objetivo) },
      },
      include: {
        cliente: { select: { nombre: true } },
        responsable: { select: { id: true, email: true, nombre: true } },
      },
    });

    for (const p of pendientes) {
      const destino = p.responsable;
      const nombreCliente = p.cliente?.nombre ?? "General";
      const cuando = v.dias === 0 ? "HOY" : `en ${v.dias} días`;
      const mensaje = `Vencimiento ${cuando}: ${p.tipo} — ${nombreCliente} (${formatFecha(p.fechaVencimiento)})`;

      if (destino) {
        await crearNotificacion({
          userId: destino.id,
          tipo: "VENCIMIENTO_PROXIMO",
          mensaje,
          entidadTipo: "Vencimiento",
          entidadId: p.id,
        });

        if (v.email) {
          await enviarEmailSeguro(
            destino.email,
            `${v.dias === 0 ? "⚠️ VENCE HOY" : "Vencimiento próximo"}: ${p.tipo} — ${nombreCliente}`,
            plantillaEmail(
              v.dias === 0 ? "⚠️ Vencimiento HOY" : `Vencimiento en ${v.dias} días`,
              `<p>${mensaje}</p><p>Ingresá al sistema para gestionarlo.</p>`
            )
          );
        }
      }

      await prisma.vencimiento.update({
        where: { id: p.id },
        data: { [v.flag]: true },
      });

      if (v.dias === 7) resumen.alertas7d++;
      else if (v.dias === 3) resumen.alertas3d++;
      else resumen.alertasDia++;
    }
  }

  // ── 3. Tareas vencidas (sin notificación previa de hoy) ──
  const tareasVencidas = await prisma.tarea.findMany({
    where: {
      estado: { not: "COMPLETADA" },
      fechaLimite: { lt: startOfDay(hoy) },
    },
    select: { id: true, titulo: true, responsableId: true },
  });

  for (const t of tareasVencidas) {
    const yaAvisada = await prisma.notificacion.findFirst({
      where: {
        userId: t.responsableId,
        tipo: "TAREA_VENCIDA",
        entidadId: t.id,
        createdAt: { gte: startOfDay(hoy) },
      },
      select: { id: true },
    });
    if (yaAvisada) continue;

    await crearNotificacion({
      userId: t.responsableId,
      tipo: "TAREA_VENCIDA",
      mensaje: `Tarea vencida: ${t.titulo}`,
      entidadTipo: "Tarea",
      entidadId: t.id,
    });
    resumen.tareasVencidas++;
  }

  // ── 4. Licencia por vencer (≤5 días) → email al proveedor ──
  const licencia = await prisma.licencia.findFirst({ orderBy: { createdAt: "desc" } });
  if (
    licencia &&
    licencia.estado === "ACTIVA" &&
    licencia.venceEl <= addDays(hoy, 5) &&
    process.env.SUPERADMIN_EMAIL
  ) {
    resumen.licenciaAvisada = await enviarEmailSeguro(
      process.env.SUPERADMIN_EMAIL,
      `Licencia ArandúSoft vence el ${formatFecha(licencia.venceEl)}`,
      plantillaEmail(
        "Licencia por vencer",
        `<p>La licencia de Criterio Asesores vence el <strong>${formatFecha(licencia.venceEl)}</strong>.</p>
         <p>Verificá el pago o suspendé el acceso desde el panel de administración.</p>`
      )
    );

    if (licencia.venceEl <= hoy) {
      await prisma.licencia.update({
        where: { id: licencia.id },
        data: { estado: "POR_VENCER" },
      });
    }
  }

  return NextResponse.json({ data: resumen });
}
