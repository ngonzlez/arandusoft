// Lógica compartida de catálogos (departamentos/ciudades/juzgados/secretarías),
// usada tanto por prisma/seed.ts (seed completo, dev) como por
// prisma/seed-catalogos.ts (solo catálogos, seguro para correr en producción
// con datos reales — nunca toca User/Cliente/Licencia).
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Departamentos + ciudades principales de Paraguay. NO es la lista completa
// de ~260 municipios — punto de partida razonable, ampliable desde el CRUD
// de Configuración. Central está confirmado contra el Excel real de juzgados
// del estudio (coincide con sus circunscripciones).
export const DEPARTAMENTOS_SEED: { nombre: string; ciudades: string[] }[] = [
  { nombre: "Distrito Capital", ciudades: ["Asunción"] },
  {
    nombre: "Central",
    ciudades: [
      "San Lorenzo", "Fernando de la Mora", "Luque", "Mariano Roque Alonso",
      "Villa Elisa", "Ñemby", "Capiatá", "Lambaré", "J. Augusto Saldívar",
      "Itauguá", "Nueva Italia", "Villeta", "Limpio", "Areguá", "Ypané",
      "Guarambaré", "Itá", "San Antonio", "Ypacaraí",
    ],
  },
  { nombre: "Concepción", ciudades: ["Concepción"] },
  { nombre: "San Pedro", ciudades: ["San Pedro de Ycuamandiyú"] },
  { nombre: "Cordillera", ciudades: ["Caacupé"] },
  { nombre: "Guairá", ciudades: ["Villarrica"] },
  { nombre: "Caaguazú", ciudades: ["Coronel Oviedo"] },
  { nombre: "Caazapá", ciudades: ["Caazapá"] },
  { nombre: "Itapúa", ciudades: ["Encarnación"] },
  { nombre: "Misiones", ciudades: ["San Juan Bautista"] },
  { nombre: "Paraguarí", ciudades: ["Paraguarí"] },
  { nombre: "Alto Paraná", ciudades: ["Ciudad del Este"] },
  { nombre: "Ñeembucú", ciudades: ["Pilar"] },
  { nombre: "Amambay", ciudades: ["Pedro Juan Caballero"] },
  { nombre: "Canindeyú", ciudades: ["Salto del Guairá"] },
  { nombre: "Presidente Hayes", ciudades: ["Villa Hayes"] },
  { nombre: "Boquerón", ciudades: ["Filadelfia"] },
  { nombre: "Alto Paraguay", ciudades: ["Fuerte Olimpo"] },
];

interface JuzgadoSeed {
  nombre: string;
  circunscripcion: string | null;
  fuero: string | null;
  juezActual: string | null;
  ubicacion: string | null;
  telefono: string | null;
  secretarias: { nombre: string; actuario: string | null; telefono: string | null }[];
}

export async function seedCatalogos(prisma: PrismaClient) {
  for (const dep of DEPARTAMENTOS_SEED) {
    const departamento = await prisma.departamento.upsert({
      where: { nombre: dep.nombre },
      update: {},
      create: { nombre: dep.nombre },
    });
    for (const nombreCiudad of dep.ciudades) {
      await prisma.ciudad.upsert({
        where: { departamentoId_nombre: { departamentoId: departamento.id, nombre: nombreCiudad } },
        update: {},
        create: { nombre: nombreCiudad, departamentoId: departamento.id },
      });
    }
  }

  // Juzgados/Secretarías: importados una vez desde el Excel real del estudio
  // (ver scripts/convertir-juzgados-excel.ts) → prisma/data/juzgados-referencia.json.
  // Parseo estructural, no verificación judicial — revisar desde el CRUD.
  const rutaJuzgados = join(__dirname, "data/juzgados-referencia.json");
  let juzgadosCreados = 0;
  let secretariasCreadas = 0;

  if (existsSync(rutaJuzgados)) {
    const juzgadosSeed: JuzgadoSeed[] = JSON.parse(readFileSync(rutaJuzgados, "utf-8"));

    for (const j of juzgadosSeed) {
      // Prisma no permite null en el lado de un @@unique compuesto (Postgres
      // no garantiza unicidad entre NULLs) — se usa "" como sentinel.
      const circunscripcion = j.circunscripcion ?? "";
      const juzgado = await prisma.juzgado.upsert({
        where: { nombre_circunscripcion: { nombre: j.nombre, circunscripcion } },
        update: {},
        create: {
          nombre: j.nombre,
          circunscripcion,
          fuero: j.fuero,
          juezActual: j.juezActual,
          ubicacion: j.ubicacion,
          telefono: j.telefono,
        },
      });
      juzgadosCreados++;
      for (const s of j.secretarias) {
        await prisma.secretaria.upsert({
          where: { juzgadoId_nombre: { juzgadoId: juzgado.id, nombre: s.nombre } },
          update: {},
          create: { nombre: s.nombre, juzgadoId: juzgado.id, actuario: s.actuario, telefono: s.telefono },
        });
        secretariasCreadas++;
      }
    }
  }

  return {
    departamentos: DEPARTAMENTOS_SEED.length,
    juzgados: juzgadosCreados,
    secretarias: secretariasCreadas,
  };
}
