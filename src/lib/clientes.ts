import { TipoObligacion } from "@prisma/client";

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

export function validarRuc(ruc: string): boolean {
  // RUC paraguayo: dígitos con guión y dígito verificador (ej. 80012345-7),
  // o CI numérica. Validación laxa: 4-15 caracteres, dígitos y un guión opcional.
  return /^\d{1,12}(-\d)?$/.test(ruc.trim());
}
