import { TipoObligacion } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { TZ_PARAGUAY } from "@/lib/format";

// Estructura del JSON de accesos (se guarda cifrado con lib/crypto).
// Solo ADMIN lo ve — jamás debe salir en una respuesta API para otro rol.
export interface AccesosCliente {
  marangatu?: { usuario: string; clave: string };
  set?: { usuario: string; clave: string };
  ips?: { usuario: string; clave: string };
  mites?: { usuario: string; clave: string };
  otros?: string;
}

export const OBLIGACIONES_LABELS: Record<TipoObligacion, string> = {
  IVA: "IVA",
  IRE_SIMPLE: "IRE Simple",
  IRE_GENERAL: "IRE General",
  IRP: "IRP",
  EEFF: "Estados Financieros",
  AUDITORIA_EXTERNA: "Auditoría Externa",
  IDU: "IDU",
  IUID: "IUID",
  IPS: "IPS",
  MITES: "MITES",
  REG_MENSUAL_COMPROBANTES: "Reg. Mensual Comprobantes",
  OTRO: "Otro",
};

export const TIPO_CLIENTE_LABELS: Record<string, string> = {
  CONTABLE: "Contable",
  JURIDICO: "Jurídico",
  AMBOS: "Mixto",
};

export const ESTADO_CLIENTE_LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  PROSPECTO: "Prospecto",
};

export const ESTADO_FISCAL_LABELS: Record<string, string> = {
  AL_DIA: "Al día",
  ATRASADO: "Atrasado",
  CCT: "CCT",
  VECTOR_FISCAL: "Vector Fiscal",
};

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

export interface ObligacionInput {
  tipo: TipoObligacion;
  diaVencimiento: number | null;
}

// Acepta el body crudo del form: [{tipo, diaVencimiento}, ...]. Descarta
// tipos inválidos y normaliza el día (1-31 o null = sin configurar / auto-RUC).
export function parseObligaciones(raw: unknown): ObligacionInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (o): o is { tipo: string; diaVencimiento?: unknown } =>
        o && typeof o === "object" && Object.values(TipoObligacion).includes(o.tipo)
    )
    .map((o) => {
      const dia = Number(o.diaVencimiento);
      const diaVencimiento = Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null;
      return { tipo: o.tipo as TipoObligacion, diaVencimiento };
    });
}

export function validarRuc(ruc: string): boolean {
  // RUC paraguayo: dígitos con guión y dígito verificador (ej. 80012345-7),
  // o CI numérica. Validación laxa: 4-15 caracteres, dígitos y un guión opcional.
  return /^\d{1,12}(-\d)?$/.test(ruc.trim());
}
