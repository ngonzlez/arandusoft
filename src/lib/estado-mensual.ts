import { TipoObligacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularVencimientoIVA } from "@/lib/vencimientos";
import { recalcularEstadoFiscal } from "@/lib/clientes";

// Fecha de vencimiento de una obligación para el período (año, mes 1-12).
// IVA sin día configurado → calendario DNIT automático por RUC.
// Cualquier otra obligación (o IVA con override manual) → día `diaVencimiento`
// del mes SIGUIENTE al período, mismo criterio que IVA.
// Sin día configurado y no es IVA → no hay forma de saber si está atrasada.
export function calcularFechaVencimientoObligacion(
  ruc: string,
  tipo: TipoObligacion,
  diaVencimiento: number | null,
  año: number,
  mes: number
): Date | null {
  if (diaVencimiento == null) {
    return tipo === "IVA" ? calcularVencimientoIVA(ruc, año, mes) : null;
  }
  return new Date(Date.UTC(año, mes, diaVencimiento, 12, 0, 0));
}

interface ClienteConObligaciones {
  id: string;
  ruc: string;
  obligaciones: { tipo: TipoObligacion; diaVencimiento: number | null }[];
}

// Marca VENCIDO (idempotente) cualquier obligación cuyo vencimiento configurado
// ya pasó y sigue sin presentarse. Nunca pisa PRESENTADO / NO_APLICA / un
// VENCIDO ya registrado a mano. Se llama al ver Estado Mensual y en el cron
// diario — así funciona sin depender de que alguien tilde algo.
export async function sincronizarVencidosEstadoMensual(
  clientes: ClienteConObligaciones[],
  mes: string // "AAAA-MM"
): Promise<number> {
  const [año, mesNum] = mes.split("-").map(Number);
  const hoy = new Date();
  let marcados = 0;

  for (const c of clientes) {
    let clienteAfectado = false;

    for (const o of c.obligaciones) {
      const fechaVenc = calcularFechaVencimientoObligacion(c.ruc, o.tipo, o.diaVencimiento, año, mesNum);
      if (!fechaVenc || fechaVenc >= hoy) continue;

      const existente = await prisma.estadoMensual.findUnique({
        where: { clienteId_mes_obligacion: { clienteId: c.id, mes, obligacion: o.tipo } },
        select: { estado: true },
      });
      if (existente && existente.estado !== "PENDIENTE") continue;

      await prisma.estadoMensual.upsert({
        where: { clienteId_mes_obligacion: { clienteId: c.id, mes, obligacion: o.tipo } },
        create: { clienteId: c.id, mes, obligacion: o.tipo, estado: "VENCIDO" },
        update: { estado: "VENCIDO" },
      });
      marcados++;
      clienteAfectado = true;
    }

    // Estado fiscal inmediato — no esperar al cron nocturno para reflejar el atraso.
    if (clienteAfectado) await recalcularEstadoFiscal(c.id);
  }

  return marcados;
}

// Mapa {tipo: fechaISO|null} para mostrar "vence el ..." en la UI, incluso
// para obligaciones que todavía no están vencidas.
export function mapaFechasVencimiento(
  ruc: string,
  obligaciones: { tipo: TipoObligacion; diaVencimiento: number | null }[],
  año: number,
  mes: number
): Record<string, string | null> {
  const mapa: Record<string, string | null> = {};
  for (const o of obligaciones) {
    const fecha = calcularFechaVencimientoObligacion(ruc, o.tipo, o.diaVencimiento, año, mes);
    mapa[o.tipo] = fecha ? fecha.toISOString() : null;
  }
  return mapa;
}
