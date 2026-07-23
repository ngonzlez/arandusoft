import { TipoObligacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularFechaVencimientoObligacion } from "@/lib/vencimientos";
import { recalcularEstadoFiscal } from "@/lib/clientes";

export { calcularFechaVencimientoObligacion };

interface ClienteConObligaciones {
  id: string;
  ruc: string;
  obligaciones: { tipo: TipoObligacion; diaVencimiento: number | null }[];
}

// Marca VENCIDO (idempotente) cualquier obligación cuyo vencimiento configurado
// ya pasó y sigue sin presentarse. Nunca pisa PRESENTADO / NO_APLICA / un
// VENCIDO ya registrado a mano. Se llama al ver Estado Mensual y en el cron
// diario — así funciona sin depender de que alguien tilde algo.
interface CandidatoVencido {
  clienteId: string;
  obligacion: TipoObligacion;
}

export async function sincronizarVencidosEstadoMensual(
  clientes: ClienteConObligaciones[],
  mes: string // "AAAA-MM"
): Promise<number> {
  const [año, mesNum] = mes.split("-").map(Number);
  const hoy = new Date();

  // 1) Candidatos en memoria (sin DB): obligaciones cuyo vencimiento ya pasó.
  const candidatos: CandidatoVencido[] = [];
  for (const c of clientes) {
    for (const o of c.obligaciones) {
      const fechaVenc = calcularFechaVencimientoObligacion(c.ruc, o.tipo, o.diaVencimiento, año, mesNum);
      if (!fechaVenc || fechaVenc >= hoy) continue;
      candidatos.push({ clienteId: c.id, obligacion: o.tipo });
    }
  }

  // Caso más común: el cron diario ya corrió hoy y no queda nada por marcar
  // — cero DB calls, no bloquea el render de la página.
  if (candidatos.length === 0) return 0;

  const clienteIds = [...new Set(candidatos.map((cand) => cand.clienteId))];

  // 2) Un solo findMany batched (usa el índice único [clienteId, mes,
  // obligacion]) en vez de un findUnique por candidato.
  const existentes = await prisma.estadoMensual.findMany({
    where: { clienteId: { in: clienteIds }, mes },
    select: { clienteId: true, obligacion: true, estado: true },
  });
  const estadoPorClave = new Map(existentes.map((e) => [`${e.clienteId}::${e.obligacion}`, e.estado]));

  // Nunca pisa PRESENTADO / NO_APLICA / un VENCIDO ya registrado a mano:
  // solo se actúa si no hay registro todavía o si sigue en PENDIENTE.
  const aMarcar = candidatos.filter((cand) => {
    const estado = estadoPorClave.get(`${cand.clienteId}::${cand.obligacion}`);
    return estado === undefined || estado === "PENDIENTE";
  });

  if (aMarcar.length === 0) return 0;

  // 3) Upserts batched en vez de loop secuencial.
  await Promise.all(
    aMarcar.map((cand) =>
      prisma.estadoMensual.upsert({
        where: { clienteId_mes_obligacion: { clienteId: cand.clienteId, mes, obligacion: cand.obligacion } },
        create: { clienteId: cand.clienteId, mes, obligacion: cand.obligacion, estado: "VENCIDO" },
        update: { estado: "VENCIDO" },
      })
    )
  );

  // 4) Estado fiscal inmediato — no esperar al cron nocturno para reflejar
  // el atraso — batched por cliente afectado (deduplicado) en vez de una
  // llamada por cliente dentro del loop principal.
  const clientesAfectados = [...new Set(aMarcar.map((cand) => cand.clienteId))];
  await Promise.all(clientesAfectados.map((id) => recalcularEstadoFiscal(id)));

  return aMarcar.length;
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
