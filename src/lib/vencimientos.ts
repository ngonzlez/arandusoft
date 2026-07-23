import "server-only";
import { TipoObligacion, TipoVencimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import type { Rol } from "@prisma/client";
export { TIPO_VENCIMIENTO_META, etiquetaVencimiento, colorUrgencia } from "@/lib/vencimientos-ui";

// Calendario perpetuo DNIT: día de vencimiento de IVA según terminación de RUC/CI.
export const CALENDARIO_DNIT: Record<string, number> = {
  "0": 7,
  "1": 9,
  "2": 11,
  "3": 13,
  "4": 15,
  "5": 17,
  "6": 19,
  "7": 21,
  "8": 23,
  "9": 25,
};

// Terminación = último dígito numérico del RUC SIN el dígito verificador.
// "80012345-7" → base "80012345" → terminación "5".
export function terminacionRuc(ruc: string): string | null {
  const base = ruc.includes("-") ? ruc.split("-")[0] : ruc;
  const digitos = base.replace(/\D/g, "");
  return digitos.length > 0 ? digitos[digitos.length - 1] : null;
}

// Vencimiento de IVA del período (año, mes 1-12) = día DNIT del MES SIGUIENTE.
// Se guarda a las 12:00 UTC (= 08:00 Paraguay) para evitar corrimientos de fecha.
export function calcularVencimientoIVA(ruc: string, año: number, mes: number): Date | null {
  const term = terminacionRuc(ruc);
  if (!term) return null;
  const dia = CALENDARIO_DNIT[term];
  // mes es 1-12; el vencimiento cae en el mes siguiente al período
  return new Date(Date.UTC(año, mes, dia, 12, 0, 0));
}

// Fecha de vencimiento de una obligación para el período (año, mes 1-12).
// IVA sin día configurado → calendario DNIT automático por RUC.
// Cualquier otra obligación (o IVA con override manual del cliente) → día
// `diaVencimiento` del mes SIGUIENTE al período, mismo criterio que IVA.
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

// Igual que generarVencimientosDelMes pero para un solo cliente — se usa en
// su ficha para que "Próximo vencimiento" esté al día sin depender de que
// alguien haya visitado el Calendario primero.
export async function generarVencimientosClienteDelMes(
  clienteId: string,
  año: number,
  mes: number
): Promise<number> {
  const periodoAño = mes === 1 ? año - 1 : año;
  const periodoMes = mes === 1 ? 12 : mes - 1;

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: {
      id: true,
      ruc: true,
      responsableId: true,
      obligaciones: { where: { activa: true }, select: { tipo: true, diaVencimiento: true } },
    },
  });
  if (!cliente) return 0;

  // Filas objetivo en memoria (sin DB) antes de escribir nada.
  const filas: { tipo: TipoObligacion; fecha: Date }[] = [];
  for (const o of cliente.obligaciones) {
    const fecha = calcularFechaVencimientoObligacion(cliente.ruc, o.tipo, o.diaVencimiento, periodoAño, periodoMes);
    if (fecha) filas.push({ tipo: o.tipo, fecha });
  }
  if (filas.length === 0) return 0;

  // Promise.all en vez de loop secuencial de upserts.
  await Promise.all(
    filas.map((f) =>
      prisma.vencimiento.upsert({
        where: {
          clienteId_tipo_fechaVencimiento: { clienteId: cliente.id, tipo: f.tipo, fechaVencimiento: f.fecha },
        },
        create: {
          clienteId: cliente.id,
          tipo: f.tipo,
          fechaVencimiento: f.fecha,
          responsableId: cliente.responsableId,
        },
        update: {},
      })
    )
  );
  return filas.length;
}

// Genera (idempotente) los vencimientos del Calendario cuya fecha cae en el
// mes dado, para toda obligación activa que tenga fecha calculable (IVA
// siempre; el resto solo si el cliente le configuró un día). Es la MISMA
// fuente de fecha que usa Estado Mensual (calcularFechaVencimientoObligacion)
// — así el Calendario, "Próximo vencimiento" y el checklist siempre coinciden.
export async function generarVencimientosDelMes(año: number, mes: number): Promise<number> {
  // Vencimiento en (año, mes) corresponde al período (año, mes-1)
  const periodoAño = mes === 1 ? año - 1 : año;
  const periodoMes = mes === 1 ? 12 : mes - 1;

  const clientes = await prisma.cliente.findMany({
    where: { estado: "ACTIVO" },
    select: {
      id: true,
      ruc: true,
      responsableId: true,
      obligaciones: { where: { activa: true }, select: { tipo: true, diaVencimiento: true } },
    },
  });

  // Filas objetivo en memoria (sin DB) antes de escribir nada.
  const filas: { clienteId: string; responsableId: string; tipo: TipoObligacion; fecha: Date }[] = [];
  for (const c of clientes) {
    for (const o of c.obligaciones) {
      const fecha = calcularFechaVencimientoObligacion(c.ruc, o.tipo, o.diaVencimiento, periodoAño, periodoMes);
      if (fecha) filas.push({ clienteId: c.id, responsableId: c.responsableId, tipo: o.tipo, fecha });
    }
  }
  if (filas.length === 0) return 0;

  // Promise.all en vez de loop secuencial. Si la base de clientes crece
  // mucho (miles de filas), esto debería chunkearse — no hace falta con el
  // tamaño actual de este estudio.
  await Promise.all(
    filas.map((f) =>
      prisma.vencimiento.upsert({
        where: {
          clienteId_tipo_fechaVencimiento: {
            clienteId: f.clienteId,
            tipo: f.tipo,
            fechaVencimiento: f.fecha,
          },
        },
        create: {
          clienteId: f.clienteId,
          tipo: f.tipo,
          fechaVencimiento: f.fecha,
          responsableId: f.responsableId,
        },
        update: {}, // ya existe: no tocar estado ni flags de notificación
      })
    )
  );
  return filas.length;
}

// Filtro de vencimientos visibles por rol: los de clientes visibles + los sin cliente.
export function filtroVencimientosPorRol(rol: Rol) {
  const filtroCliente = filtroClientesPorRol(rol);
  if (Object.keys(filtroCliente).length === 0) return {};
  return { OR: [{ cliente: filtroCliente }, { clienteId: null }] };
}
