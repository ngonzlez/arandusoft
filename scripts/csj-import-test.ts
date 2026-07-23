/**
 * Prueba end-to-end del pipeline de importación CSJ (Fase 1, verificación #3).
 * Corre el servicio real contra CSJ y escribe a la BD local. Idempotente.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/csj-import-test.ts
 *
 * Requiere en env: DATABASE_URL (.env), CSJ_USUARIO / CSJ_PASSWORD (.env.local).
 * NO se commitea al flujo productivo — es un helper de validación local.
 */
import { PrismaClient } from "@prisma/client";
import { CsjClient } from "@/lib/csj/client";
import { importarCaso } from "@/lib/csj/importar";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { rol: { in: ["JURIDICO", "ADMIN"] }, activo: true },
    select: { id: true, nombre: true },
  });
  if (!user) throw new Error("No hay usuario JURIDICO/ADMIN en la BD local");

  const csj = new CsjClient(process.env.CSJ_USUARIO ?? "", process.env.CSJ_PASSWORD ?? "");
  const casoId = Number(process.env.CSJ_CASO_ID ?? 1961357);
  const instancia = process.env.CSJ_INSTANCIA ?? "2:0";

  console.log(`Importando caso ${casoId}/${instancia} como responsable ${user.nombre}…`);
  const r = await importarCaso(csj, { casoId, instancia, responsableId: user.id });
  console.log("RESULTADO:", r);

  const exp = await prisma.expediente.findUnique({
    where: { id: r.expedienteId },
    include: {
      materia: { select: { nombre: true } },
      circunscripcion: { select: { nombre: true } },
      actuaciones: { take: 3, orderBy: { fecha: "desc" } },
      _count: { select: { actuaciones: true, intervinientes: true } },
    },
  });
  console.log("\nEXPEDIENTE EN BD:");
  console.log(
    JSON.stringify(
      {
        caratula: exp?.caratula,
        numero: exp?.numero,
        anio: exp?.anio,
        materia: exp?.materia?.nombre,
        circunscripcion: exp?.circunscripcion?.nombre,
        origenCsj: exp?.origenCsj,
        totalActuaciones: exp?._count.actuaciones,
        totalIntervinientes: exp?._count.intervinientes,
        primeras3Actuaciones: exp?.actuaciones.map((a) => ({
          grupo: a.grupoProceso,
          desc: a.descripcion.slice(0, 50),
          tipo: a.tipo,
          fecha: a.fecha,
        })),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
