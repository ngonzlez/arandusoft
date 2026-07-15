import type { TipoVencimiento } from "@prisma/client";

// Puro presentacional — sin Prisma client ni nada server-only. Seguro de
// importar desde componentes "use client" (CalendarioGrid, VencimientosLista).
// El resto de lib/vencimientos.ts es server-only (usa prisma + api-auth) y
// re-exporta esto para no romper los imports existentes del lado servidor.

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

// Etiqueta legible de un vencimiento: para OTRO con descripción se usa la
// descripción como nombre principal (si no, se vería el crudo "OTRO"); para
// el resto de tipos se muestra el tipo. Reusado en todas las vistas y el cron.
export function etiquetaVencimiento(tipo: TipoVencimiento, descripcion?: string | null): string {
  if (tipo === "OTRO" && descripcion?.trim()) return descripcion.trim();
  return tipo;
}

// Color por urgencia (días hasta el vencimiento) — igual al prototipo:
// vencido/hoy rojo, ≤3 días naranja, resto azul.
export function colorUrgencia(fecha: Date | string): string {
  const dias = Math.floor((new Date(fecha).getTime() - Date.now()) / 86_400_000);
  if (dias <= 0) return "#DC2626";
  if (dias <= 3) return "#D97706";
  return "#2563EB";
}
