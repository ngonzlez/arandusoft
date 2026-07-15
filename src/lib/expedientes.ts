export const TIPO_EXPEDIENTE_LABELS: Record<string, string> = {
  DEMANDA: "Demanda",
  CONTESTACION: "Contestación",
  APELACION: "Apelación",
  AUDIENCIA: "Audiencia",
  OTRO: "Otro",
};

export const ESTADO_EXPEDIENTE_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  EN_PROCESO: "En proceso",
  EN_REVISION: "En revisión",
  COMPLETADO: "Completado",
  ARCHIVADO: "Archivado",
};

// "1234/2026" — con lo que haya cargado; nunca ambos vacíos y "—" a la vez.
export function formatNumeroExpediente(numero: string | null, anio: number | null): string {
  if (!numero && !anio) return "—";
  if (numero && anio) return `${numero}/${anio}`;
  return numero ?? String(anio);
}
