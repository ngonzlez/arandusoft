import { TipoVencimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import type { Rol } from "@prisma/client";

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

// Genera (idempotente) los vencimientos de IVA cuyo vencimiento cae en el mes dado,
// para todos los clientes activos con obligación IVA activa.
// Solo IVA se calcula automáticamente (única tabla oficial en el PRD);
// el resto de los tipos se cargan manualmente o por importación.
export async function generarVencimientosIvaDelMes(año: number, mes: number): Promise<number> {
  // Vencimiento en (año, mes) corresponde al período (año, mes-1)
  const periodoAño = mes === 1 ? año - 1 : año;
  const periodoMes = mes === 1 ? 12 : mes - 1;

  const clientes = await prisma.cliente.findMany({
    where: {
      estado: "ACTIVO",
      obligaciones: { some: { tipo: "IVA", activa: true } },
    },
    select: { id: true, ruc: true, responsableId: true },
  });

  let creados = 0;
  for (const c of clientes) {
    const fecha = calcularVencimientoIVA(c.ruc, periodoAño, periodoMes);
    if (!fecha) continue;

    await prisma.vencimiento.upsert({
      where: {
        clienteId_tipo_fechaVencimiento: {
          clienteId: c.id,
          tipo: "IVA",
          fechaVencimiento: fecha,
        },
      },
      create: {
        clienteId: c.id,
        tipo: "IVA",
        fechaVencimiento: fecha,
        responsableId: c.responsableId,
      },
      update: {}, // ya existe: no tocar estado ni flags de notificación
    });
    creados++;
  }
  return creados;
}

// Badge por tipo de vencimiento — pares exactos del prototipo (vtypeMeta),
// extendidos a los tipos propios que no están en el mock original.
export const TIPO_VENCIMIENTO_META: Record<TipoVencimiento, { bg: string; text: string }> = {
  IVA: { bg: "#EAF0F8", text: "#22416E" },
  IRE_SIMPLE: { bg: "#FEF3C7", text: "#A16207" },
  IRE_GENERAL: { bg: "#FEF3C7", text: "#A16207" },
  IRP: { bg: "#FEF3C7", text: "#A16207" },
  EEFF: { bg: "#EDE9FE", text: "#6D28D9" },
  AUDITORIA_EXTERNA: { bg: "#EDE9FE", text: "#6D28D9" },
  IDU: { bg: "#FEF3C7", text: "#A16207" },
  IUID: { bg: "#FEF3C7", text: "#A16207" },
  IPS: { bg: "#DCFCE7", text: "#15803D" },
  MITES: { bg: "#FFEDD5", text: "#C2410C" },
  REG_MENSUAL_COMPROBANTES: { bg: "#EAF0F8", text: "#22416E" },
  ASAMBLEA: { bg: "#EDE9FE", text: "#6D28D9" },
  RENOVACION_CONTRATO: { bg: "#FFEDD5", text: "#C2410C" },
  PLAZO_PROCESAL: { bg: "#FEE2E2", text: "#DC2626" },
  OTRO: { bg: "#F1F5F9", text: "#64748B" },
};

// Color por urgencia (días hasta el vencimiento) — igual al prototipo:
// vencido/hoy rojo, ≤3 días naranja, resto azul.
export function colorUrgencia(fecha: Date | string): string {
  const dias = Math.floor((new Date(fecha).getTime() - Date.now()) / 86_400_000);
  if (dias <= 0) return "#DC2626";
  if (dias <= 3) return "#D97706";
  return "#2563EB";
}

// Filtro de vencimientos visibles por rol: los de clientes visibles + los sin cliente.
export function filtroVencimientosPorRol(rol: Rol) {
  const filtroCliente = filtroClientesPorRol(rol);
  if (Object.keys(filtroCliente).length === 0) return {};
  return { OR: [{ cliente: filtroCliente }, { clienteId: null }] };
}
