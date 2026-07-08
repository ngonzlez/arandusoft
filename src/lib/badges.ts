// Pares bg/text del prototipo Claude Design actualizado (2026-07-08).
// No usar clases Tailwind sueltas para badges — siempre lookup acá.

export type BadgeStyle = { bg: string; text: string; dot?: string };

export const TIPO_CLIENTE: Record<string, BadgeStyle> = {
  JURIDICO: { bg: "#EAF0F8", text: "#22416E" },
  CONTABLE: { bg: "#FEF3C7", text: "#92400E" },
  AMBOS: { bg: "#DCFCE7", text: "#15803D" },
};

export const ESTADO_CLIENTE: Record<string, BadgeStyle> = {
  ACTIVO: { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
  INACTIVO: { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8" },
  PROSPECTO: { bg: "#DBEAFE", text: "#1D4ED8", dot: "#2563EB" },
};

export const ESTADO_FISCAL: Record<string, BadgeStyle> = {
  AL_DIA: { bg: "#DCFCE7", text: "#15803D" },
  ATRASADO: { bg: "#FEE2E2", text: "#DC2626" },
  CCT: { bg: "#FEF3C7", text: "#A16207" },
  VECTOR_FISCAL: { bg: "#FFEDD5", text: "#C2410C" },
};

export const ESTADO_OBLIGACION: Record<string, BadgeStyle> = {
  PRESENTADO: { bg: "#DCFCE7", text: "#15803D" },
  PENDIENTE: { bg: "#FEF3C7", text: "#A16207" },
  VENCIDO: { bg: "#FEE2E2", text: "#DC2626" },
  NO_APLICA: { bg: "#F1F5F9", text: "#64748B" },
};

export const ESTADO_TAREA: Record<string, BadgeStyle> = {
  PENDIENTE: { bg: "#F1F5F9", text: "#64748B" },
  EN_PROGRESO: { bg: "#DBEAFE", text: "#1D4ED8" },
  COMPLETADA: { bg: "#DCFCE7", text: "#15803D" },
};

export const PRIORIDAD: Record<string, BadgeStyle> = {
  ALTA: { bg: "#FEE2E2", text: "#DC2626" },
  MEDIA: { bg: "#FEF3C7", text: "#A16207" },
  BAJA: { bg: "#F1F5F9", text: "#64748B" },
};

export const ESTADO_VENCIMIENTO: Record<string, BadgeStyle> = {
  PENDIENTE: { bg: "#FEF3C7", text: "#A16207" },
  GESTIONADO: { bg: "#DCFCE7", text: "#15803D" },
  VENCIDO: { bg: "#FEE2E2", text: "#DC2626" },
};

export const ESTADO_EXPEDIENTE: Record<string, BadgeStyle> = {
  NUEVO: { bg: "#DBEAFE", text: "#1D4ED8" },
  EN_PROCESO: { bg: "#FEF3C7", text: "#A16207" },
  EN_REVISION: { bg: "#EDE9FE", text: "#6D28D9" },
  COMPLETADO: { bg: "#DCFCE7", text: "#15803D" },
  ARCHIVADO: { bg: "#F1F5F9", text: "#64748B" },
};

// Colores fijos de avatar por índice (patrón respColor del prototipo)
export const AVATAR_COLORS = [
  "#1A2C4E",
  "#0E7490",
  "#B45309",
  "#2563EB",
  "#7C3AED",
  "#DC2626",
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
