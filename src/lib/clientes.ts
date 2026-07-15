import "server-only";
import { TipoVencimiento } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { TZ_PARAGUAY } from "@/lib/format";

export {
  type AccesosCliente,
  OBLIGACIONES_LABELS,
  TIPO_CLIENTE_LABELS,
  ESTADO_CLIENTE_LABELS,
  ESTADO_FISCAL_LABELS,
  type ObligacionInput,
  parseObligaciones,
  validarRuc,
} from "@/lib/clientes-ui";

// Recalcula AL_DIA/ATRASADO real (no solo lo que alguien tildó a mano).
// "Atrasado" = tiene alguna obligación VENCIDO, O quedó PENDIENTE de un mes
// que ya pasó (nunca se marcó, pero el mes ya cerró — sigue siendo un
// atraso real aunque nadie haya tocado esa celda). CCT y VECTOR_FISCAL son
// estados manuales del contador — nunca se pisan automáticamente.
export async function recalcularEstadoFiscal(clienteId: string, actualizadoPor?: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { estadoFiscal: true },
  });
  if (!cliente || (cliente.estadoFiscal !== "AL_DIA" && cliente.estadoFiscal !== "ATRASADO")) {
    return; // CCT / VECTOR_FISCAL: no tocar
  }

  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");

  const atrasos = await prisma.estadoMensual.count({
    where: {
      clienteId,
      OR: [{ estado: "VENCIDO" }, { estado: "PENDIENTE", mes: { lt: mesActual } }],
    },
  });

  const nuevoEstadoFiscal = atrasos > 0 ? "ATRASADO" : "AL_DIA";
  if (nuevoEstadoFiscal !== cliente.estadoFiscal) {
    await prisma.cliente.update({
      where: { id: clienteId },
      data: { estadoFiscal: nuevoEstadoFiscal, ...(actualizadoPor ? { actualizadoPor } : {}) },
    });
  }
}

// Timbrado/Firma Digital: fecha fija (no mensual), una sola vigente por
// cliente+tipo. NO usar upsert por la clave compuesta (clienteId,tipo,fecha)
// — al cambiar la fecha crearía una fila nueva en vez de reemplazar la
// vigente, dejando la vieja como Vencimiento PENDIENTE huérfano.
export async function sincronizarVencimientoFijo(
  clienteId: string,
  tipo: Extract<TipoVencimiento, "TIMBRADO" | "FIRMA_DIGITAL">,
  fecha: Date | null,
  responsableId: string
) {
  const existente = await prisma.vencimiento.findFirst({ where: { clienteId, tipo } });

  if (!fecha) {
    // Se borró la fecha desde el form: solo se quita si sigue PENDIENTE —
    // un vencimiento ya GESTIONADO/VENCIDO es historial, no se toca.
    if (existente?.estado === "PENDIENTE") {
      await prisma.vencimiento.delete({ where: { id: existente.id } });
    }
    return;
  }

  if (!existente) {
    await prisma.vencimiento.create({
      data: { clienteId, tipo, fechaVencimiento: fecha, responsableId, estado: "PENDIENTE" },
    });
    return;
  }

  // Reemplaza la vigente (nunca hay más de una por cliente+tipo, por diseño)
  // y resetea los flags de notificación — es un vencimiento nuevo, no debe
  // heredar que ya se avisó del anterior.
  if (existente.fechaVencimiento.getTime() !== fecha.getTime()) {
    await prisma.vencimiento.update({
      where: { id: existente.id },
      data: {
        fechaVencimiento: fecha,
        responsableId,
        estado: "PENDIENTE",
        notificado7d: false,
        notificado3d: false,
        notificadoDia: false,
      },
    });
  } else if (existente.responsableId !== responsableId) {
    await prisma.vencimiento.update({ where: { id: existente.id }, data: { responsableId } });
  }
}
