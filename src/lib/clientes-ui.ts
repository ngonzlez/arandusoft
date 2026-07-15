import { TipoObligacion } from "@prisma/client";

// Puro presentacional/validación — sin Prisma client ni nada server-only.
// Seguro de importar desde componentes "use client" (ClienteForm,
// AccesosPanel, DeclaracionesTab, EstadoMensualTabla). El resto de
// lib/clientes.ts es server-only (usa prisma) y re-exporta esto para no
// romper los imports existentes del lado servidor.

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
