import { prisma } from "@/lib/prisma";
import { EstadoLicencia } from "@prisma/client";

// Cache en memoria con TTL corto: evita golpear la DB en cada request
// manteniendo la suspensión efectiva en segundos.
const TTL_MS = 30_000;

interface CacheLicencia {
  estado: EstadoLicencia;
  mensaje: string | null;
  nombreEstudio: string;
  dominio: string | null;
  moduloJuridicoHabilitado: boolean;
  at: number;
}

let cache: CacheLicencia | null = null;

async function leerCache(): Promise<CacheLicencia> {
  const ahora = Date.now();
  if (!cache || ahora - cache.at > TTL_MS) {
    const licencia = await prisma.licencia.findFirst({ orderBy: { createdAt: "desc" } });
    cache = {
      estado: licencia?.estado ?? "SUSPENDIDA",
      mensaje: licencia?.mensajeSuspension ?? null,
      nombreEstudio: licencia?.nombreEstudio ?? "Mi Estudio",
      dominio: licencia?.dominio ?? null,
      moduloJuridicoHabilitado: licencia?.moduloJuridicoHabilitado ?? false,
      at: ahora,
    };
  }
  return cache;
}

export async function getEstadoLicencia(): Promise<{
  activa: boolean;
  mensaje: string | null;
}> {
  const c = await leerCache();
  return { activa: c.estado !== "SUSPENDIDA", mensaje: c.mensaje };
}

// Config del estudio (Opción A: 1 deploy = 1 cliente) — branding + módulos
// habilitados, editable desde el panel superadmin sin redeploy.
export async function getConfigEstudio(): Promise<{
  nombreEstudio: string;
  dominio: string | null;
  moduloJuridicoHabilitado: boolean;
}> {
  const c = await leerCache();
  return {
    nombreEstudio: c.nombreEstudio,
    dominio: c.dominio,
    moduloJuridicoHabilitado: c.moduloJuridicoHabilitado,
  };
}

// Llamar tras suspender/reactivar/editar config desde el panel superadmin
// para que el cambio sea inmediato en este proceso.
export function invalidarCacheLicencia() {
  cache = null;
}
