import { prisma } from "@/lib/prisma";

// Cache en memoria con TTL corto: evita golpear la DB en cada navegación
// del layout del dashboard. Precisión de hasta TTL_MS es aceptable para
// un contador de notificaciones no leídas.
const TTL_MS = 30_000;

interface CacheEntry {
  count: number;
  at: number;
}

const cache = new Map<string, CacheEntry>();

export async function getNotificacionesNoLeidasCached(userId: string): Promise<number> {
  const ahora = Date.now();
  const entry = cache.get(userId);
  if (entry && ahora - entry.at <= TTL_MS) {
    return entry.count;
  }

  const count = await prisma.notificacion.count({ where: { userId, leida: false } });
  cache.set(userId, { count, at: ahora });
  return count;
}

// Llamar tras crear/marcar leída una notificación para que el cambio
// sea inmediato en este proceso.
export function invalidarCacheNotificaciones(userId: string) {
  cache.delete(userId);
}
