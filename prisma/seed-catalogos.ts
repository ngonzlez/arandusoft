// Actualiza SOLO los catálogos de referencia (departamentos/ciudades/
// juzgados/secretarías) — nunca toca User/Cliente/Licencia. Seguro para
// correr en producción con datos reales, a diferencia de prisma/seed.ts
// completo (que también upsertea usuarios/clientes de ejemplo).
//
// Uso: cuando cambia DEPARTAMENTOS_SEED en catalogos-seed-lib.ts, o cuando
// se regenera prisma/data/juzgados-referencia.json (nuevo Excel del estudio),
// correr esto para aplicar los cambios sin re-sembrar nada más.
import { PrismaClient } from "@prisma/client";
import { seedCatalogos } from "./catalogos-seed-lib";

const prisma = new PrismaClient();

async function main() {
  const resultado = await seedCatalogos(prisma);
  console.log("Catálogos actualizados:", resultado);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
