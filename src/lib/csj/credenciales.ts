import "server-only";
import { prisma } from "@/lib/prisma";
import { encriptar, desencriptar } from "@/lib/crypto";
import { CsjClient } from "./client";

// Manejo de las credenciales CSJ por usuario, cifradas con AES-256-GCM
// (mismo patrón que Cliente.accesos). La contraseña nunca sale en claro
// fuera de este módulo server-side.

export async function guardarCredencialCsj(
  userId: string,
  usuario: string,
  clave: string,
  matricula?: string | null
) {
  return prisma.credencialCsj.upsert({
    where: { userId },
    create: {
      userId,
      usuarioEnc: encriptar(usuario),
      passwordEnc: encriptar(clave),
      matricula: matricula ?? usuario,
      activo: true,
    },
    update: {
      usuarioEnc: encriptar(usuario),
      passwordEnc: encriptar(clave),
      matricula: matricula ?? usuario,
      activo: true,
    },
  });
}

/** Construye un CsjClient con las credenciales guardadas del usuario, o null. */
export async function obtenerClienteCsj(userId: string): Promise<CsjClient | null> {
  const cred = await prisma.credencialCsj.findUnique({ where: { userId } });
  if (!cred || !cred.activo) return null;
  return new CsjClient(desencriptar(cred.usuarioEnc), desencriptar(cred.passwordEnc));
}

/** Estado de vinculación para la UI (sin secretos). */
export async function estadoVinculacionCsj(userId: string) {
  const cred = await prisma.credencialCsj.findUnique({
    where: { userId },
    select: { matricula: true, ultimoSync: true, activo: true },
  });
  return {
    vinculado: !!cred?.activo,
    matricula: cred?.matricula ?? null,
    ultimoSync: cred?.ultimoSync ?? null,
  };
}
