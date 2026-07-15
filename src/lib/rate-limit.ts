import "server-only";

// Limitador de intentos en memoria — ventana fija por clave (email o IP).
// Un solo proceso por cliente (arquitectura 1 deploy = 1 estudio), así que
// no hace falta Redis: esta memoria vive mientras el proceso esté arriba.

interface Registro {
  intentos: number;
  venceEn: number;
}

const registros = new Map<string, Registro>();

// Barre entradas vencidas cada 10 min para no crecer sin límite si alguien
// prueba muchos emails distintos.
const BARRIDO_MS = 10 * 60 * 1000;
setInterval(() => {
  const ahora = Date.now();
  for (const [clave, r] of registros) {
    if (ahora > r.venceEn) registros.delete(clave);
  }
}, BARRIDO_MS).unref();

// true = permitido, false = límite alcanzado (bloquear el intento).
export function permitirIntento(clave: string, maxIntentos: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const r = registros.get(clave);

  if (!r || ahora > r.venceEn) {
    registros.set(clave, { intentos: 1, venceEn: ahora + ventanaMs });
    return true;
  }
  if (r.intentos >= maxIntentos) return false;
  r.intentos++;
  return true;
}

// Login exitoso: liberar el contador para que no quede penalizado.
export function limpiarIntentos(clave: string) {
  registros.delete(clave);
}
