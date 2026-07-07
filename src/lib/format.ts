import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

export const TZ_PARAGUAY = "America/Asuncion";

// Regla dura del PRD: punto como separador de miles, nunca coma.
export function formatGuaranies(monto: number): string {
  return `Gs. ${monto.toLocaleString("de-DE")}`;
}

// Fechas: UTC en DB → mostrar siempre en hora Paraguay.
export function formatFecha(fecha: Date | string, patron = "dd/MM/yyyy"): string {
  return formatInTimeZone(new Date(fecha), TZ_PARAGUAY, patron, { locale: es });
}

export function formatFechaHora(fecha: Date | string): string {
  return formatFecha(fecha, "dd/MM/yyyy HH:mm");
}

export function formatFechaLarga(fecha: Date | string): string {
  return formatFecha(fecha, "EEEE d 'de' MMMM 'de' yyyy");
}

// "2026-06" → "Junio 2026" (para Estado Mensual / Asambleas)
export function formatPeriodo(periodo: string): string {
  const [año, mes] = periodo.split("-").map(Number);
  const fecha = new Date(Date.UTC(año, mes - 1, 15));
  const texto = formatInTimeZone(fecha, "UTC", "MMMM yyyy", { locale: es });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
