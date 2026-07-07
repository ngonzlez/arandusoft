import { prisma } from "@/lib/prisma";
import { EstadoLicencia } from "@prisma/client";

// Cache en memoria con TTL corto: evita golpear la DB en cada request
// manteniendo la suspensión efectiva en segundos.
const TTL_MS = 30_000;

let cache: { estado: EstadoLicencia; mensaje: string | null; at: number } | null = null;

export async function getEstadoLicencia(): Promise<{
  activa: boolean;
  mensaje: string | null;
}> {
  const ahora = Date.now();
  if (!cache || ahora - cache.at > TTL_MS) {
    const licencia = await prisma.licencia.findFirst({
      orderBy: { createdAt: "desc" },
    });
    cache = {
      estado: licencia?.estado ?? "SUSPENDIDA",
      mensaje: licencia?.mensajeSuspension ?? null,
      at: ahora,
    };
  }
  return {
    activa: cache.estado !== "SUSPENDIDA",
    mensaje: cache.mensaje,
  };
}

// Llamar tras suspender/reactivar desde el panel superadmin para
// que el cambio sea inmediato en este proceso.
export function invalidarCacheLicencia() {
  cache = null;
}
