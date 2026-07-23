import "server-only";
import { prisma } from "@/lib/prisma";
import type { CsjClient } from "./client";

// Sincroniza los catálogos de CSJ (Materias, Circunscripciones) a las tablas
// locales. Idempotente: upsert por nombre. Se puede llamar al vincular la
// cuenta o desde un seed. Tolerante a fallos por catálogo individual.
export async function sincronizarCatalogos(csj: CsjClient): Promise<{
  materias: number;
  circunscripciones: number;
}> {
  let materias = 0;
  let circunscripciones = 0;

  try {
    const { resultado } = await csj.getMaterias();
    await Promise.all(
      resultado.map((m) =>
        prisma.materia.upsert({
          where: { nombre: m.descripcion.trim() },
          create: { nombre: m.descripcion.trim(), csjId: String(m.codigo) },
          update: { csjId: String(m.codigo) },
        })
      )
    );
    materias = resultado.length;
  } catch {
    // catálogo opcional — no bloquea la vinculación
  }

  try {
    const { resultado } = await csj.getCircunscripciones();
    await Promise.all(
      resultado.map((c) =>
        prisma.circunscripcion.upsert({
          where: { nombre: c.descripcion.trim() },
          create: { nombre: c.descripcion.trim(), csjId: String(c.codigo) },
          update: { csjId: String(c.codigo) },
        })
      )
    );
    circunscripciones = resultado.length;
  } catch {
    // idem
  }

  return { materias, circunscripciones };
}
