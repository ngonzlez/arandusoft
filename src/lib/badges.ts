// Pares bg/text extraídos del prototipo aprobado (project/Criterio Asesores.dc.html).
// No usar clases Tailwind sueltas para badges — siempre lookup acá.

export type BadgeStyle = { bg: string; text: string; dot?: string };

export const TIPO_CLIENTE: Record<string, BadgeStyle> = {
  JURIDICO: { bg: "#E7EDF7", text: "#22416E" },
  CONTABLE: { bg: "#FAF1D8", text: "#866518" },
  AMBOS: { bg: "#E7F2EC", text: "#2C6E4C" },
};

export const ESTADO_CLIENTE: Record<string, BadgeStyle> = {
  ACTIVO: { bg: "#E7F2EC", text: "#2C6E4C", dot: "#3A9E6B" },
  INACTIVO: { bg: "#F0F1F4", text: "#6B7280", dot: "#9CA3AF" },
  PROSPECTO: { bg: "#E7EDF7", text: "#2F6FB0", dot: "#3B82C4" },
};

export const ESTADO_FISCAL: Record<string, BadgeStyle> = {
  AL_DIA: { bg: "#E7F2EC", text: "#2C6E4C" },
  ATRASADO: { bg: "#FBE9EC", text: "#C0344B" },
  CCT: { bg: "#FAF1D8", text: "#9A7416" },
  VECTOR_FISCAL: { bg: "#FBE9EC", text: "#C0344B" },
};

export const ESTADO_OBLIGACION: Record<string, BadgeStyle> = {
  PRESENTADO: { bg: "#E7F2EC", text: "#2C6E4C" },
  PENDIENTE: { bg: "#FAF1D8", text: "#9A7416" },
  VENCIDO: { bg: "#FBE9EC", text: "#C0344B" },
  NO_APLICA: { bg: "#F0F1F4", text: "#6B7280" },
};

export const ESTADO_TAREA: Record<string, BadgeStyle> = {
  PENDIENTE: { bg: "#F0F1F4", text: "#6B7280" },
  EN_PROGRESO: { bg: "#E7EDF7", text: "#2F6FB0" },
  COMPLETADA: { bg: "#E7F2EC", text: "#2C6E4C" },
};

export const PRIORIDAD: Record<string, BadgeStyle> = {
  ALTA: { bg: "#FBE9EC", text: "#C0344B" },
  MEDIA: { bg: "#FAF1D8", text: "#9A7416" },
  BAJA: { bg: "#EDEFF2", text: "#6B7280" },
};

export const ESTADO_VENCIMIENTO: Record<string, BadgeStyle> = {
  PENDIENTE: { bg: "#FAF1D8", text: "#9A7416" },
  GESTIONADO: { bg: "#E7F2EC", text: "#2C6E4C" },
  VENCIDO: { bg: "#FBE9EC", text: "#C0344B" },
};

export const ESTADO_EXPEDIENTE: Record<string, BadgeStyle> = {
  NUEVO: { bg: "#E7EDF7", text: "#2F6FB0" },
  EN_PROCESO: { bg: "#FAF1D8", text: "#9A7416" },
  EN_REVISION: { bg: "#EFE8F7", text: "#6D44A8" },
  COMPLETADO: { bg: "#E7F2EC", text: "#2C6E4C" },
  ARCHIVADO: { bg: "#F0F1F4", text: "#6B7280" },
};

// Colores fijos de avatar por índice (patrón respColor del prototipo)
export const AVATAR_COLORS = [
  "#1A2C4E",
  "#2E7D52",
  "#8A6D1F",
  "#2F6FB0",
  "#7A4FB0",
  "#C0344B",
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
