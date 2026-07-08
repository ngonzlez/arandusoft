import { prisma } from "@/lib/prisma";
import { getResend, EMAIL_FROM, plantillaEmail } from "@/lib/email";
import { descargarPdf, urlFirmadaPdf } from "@/lib/storage";
import { crearNotificacion } from "@/lib/notificaciones";
import { formatFechaHora } from "@/lib/format";

const LINK_EXPIRA_SEGUNDOS = 60 * 60 * 48; // 48h

function maxAdjuntoBytes(): number {
  return Number(process.env.RESEND_ATTACHMENT_MAX_BYTES ?? 8 * 1024 * 1024);
}

interface EnviarArchivoParams {
  declaracionId: string;
  remitente: { id: string; nombre: string; email: string };
  destinatarioId: string;
  mensaje?: string;
}

// Envía una declaración por correo a un usuario interno.
// ≤ umbral: adjunto directo. > umbral: link firmado 48h.
// SIEMPRE registra el intento en EnvioArchivo (auditoría), incluso si falla.
export async function enviarDeclaracionPorCorreo({
  declaracionId,
  remitente,
  destinatarioId,
  mensaje,
}: EnviarArchivoParams): Promise<{ ok: boolean; error?: string }> {
  const [declaracion, destinatario] = await Promise.all([
    prisma.declaracion.findUnique({
      where: { id: declaracionId },
      include: { cliente: { select: { nombre: true } } },
    }),
    prisma.user.findFirst({
      where: { id: destinatarioId, activo: true, rol: { not: "SUPERADMIN" } },
    }),
  ]);

  if (!declaracion) return { ok: false, error: "Declaración no encontrada" };
  if (!destinatario) return { ok: false, error: "Destinatario no válido" };

  const usarAdjunto =
    (declaracion.tamanioBytes ?? 0) <= maxAdjuntoBytes() && !!declaracion.archivoPublicId;

  const nombreArchivo =
    declaracion.archivoNombreOriginal ?? `${declaracion.tipo}-${declaracion.periodo}.pdf`;

  const cuerpoBase = `
    <p><strong>${remitente.nombre}</strong> te envió una declaración desde el sistema:</p>
    <table style="margin:12px 0;font-size:14px;color:#2D2D2D;">
      <tr><td style="padding:2px 12px 2px 0;color:#5A6473;">Cliente</td><td><strong>${declaracion.cliente.nombre}</strong></td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#5A6473;">Tipo</td><td>${declaracion.tipo}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#5A6473;">Período</td><td>${declaracion.periodo}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#5A6473;">Presentada</td><td>${formatFechaHora(declaracion.fechaPresentacion)}</td></tr>
    </table>
    ${mensaje ? `<p style="border-left:3px solid #C9A84C;padding-left:12px;color:#5A6473;">${mensaje}</p>` : ""}
  `;

  let enviado = false;
  let errorMensaje: string | null = null;
  let resendMessageId: string | null = null;
  const metodoEnvio: "ADJUNTO" | "LINK_FIRMADO" = usarAdjunto ? "ADJUNTO" : "LINK_FIRMADO";

  try {
    const resend = getResend();

    if (usarAdjunto) {
      const pdf = await descargarPdf(declaracion.archivoPublicId!);
      const res = await resend.emails.send({
        from: EMAIL_FROM,
        to: destinatario.email,
        replyTo: remitente.email,
        subject: `${declaracion.cliente.nombre} — ${declaracion.tipo} ${declaracion.periodo}`,
        html: plantillaEmail("Declaración compartida", cuerpoBase + `<p>El archivo va adjunto.</p>`),
        attachments: [{ filename: nombreArchivo, content: pdf.toString("base64") }],
      });
      if (res.error) throw new Error(res.error.message);
      resendMessageId = res.data?.id ?? null;
    } else {
      if (!declaracion.archivoPublicId) {
        throw new Error("La declaración no tiene archivo asociado en el almacenamiento");
      }
      const link = urlFirmadaPdf(declaracion.archivoPublicId, LINK_EXPIRA_SEGUNDOS);
      const res = await resend.emails.send({
        from: EMAIL_FROM,
        to: destinatario.email,
        replyTo: remitente.email,
        subject: `${declaracion.cliente.nombre} — ${declaracion.tipo} ${declaracion.periodo}`,
        html: plantillaEmail(
          "Declaración compartida",
          cuerpoBase +
            `<p style="margin:20px 0;">
              <a href="${link}" style="background:#1A2C4E;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Descargar PDF
              </a>
            </p>
            <p style="color:#9AA3AF;font-size:12px;">El enlace vence en 48 horas.</p>`
        ),
      });
      if (res.error) throw new Error(res.error.message);
      resendMessageId = res.data?.id ?? null;
    }

    enviado = true;
  } catch (e) {
    errorMensaje = e instanceof Error ? e.message : "Error desconocido";
    console.error("Error enviando archivo por correo:", e);
  }

  await prisma.envioArchivo.create({
    data: {
      declaracionId,
      remitenteId: remitente.id,
      destinatarioId: destinatario.id,
      destinatarioEmail: destinatario.email,
      mensaje: mensaje || null,
      metodoEnvio,
      enviado,
      errorMensaje,
      resendMessageId,
    },
  });

  if (enviado) {
    await crearNotificacion({
      userId: destinatario.id,
      tipo: "ARCHIVO_RECIBIDO",
      mensaje: `${remitente.nombre} te envió ${declaracion.tipo} ${declaracion.periodo} de ${declaracion.cliente.nombre}`,
      entidadTipo: "Declaracion",
      entidadId: declaracionId,
      emailEnviado: true,
    });
  }

  return enviado ? { ok: true } : { ok: false, error: errorMensaje ?? "No se pudo enviar" };
}
