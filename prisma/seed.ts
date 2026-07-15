import { PrismaClient, Rol, TipoCliente, TipoObligacion } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

// Departamentos + ciudades principales de Paraguay. NO es la lista completa
// de ~260 municipios — punto de partida razonable, ampliable desde el CRUD
// de Configuración. Central está confirmado contra el Excel real de juzgados
// del estudio (coincide con sus circunscripciones).
const DEPARTAMENTOS_SEED: { nombre: string; ciudades: string[] }[] = [
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

async function main() {
  const superadminEmail = process.env.SUPERADMIN_EMAIL;
  const superadminPasswordHash = process.env.SUPERADMIN_PASSWORD_HASH;

  if (!superadminEmail || !superadminPasswordHash) {
    throw new Error(
      "SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD_HASH deben estar seteados en .env antes de correr el seed"
    );
  }

  const superadmin = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      nombre: "Superadmin",
      email: superadminEmail,
      password: superadminPasswordHash,
      rol: Rol.SUPERADMIN,
    },
  });

  const adminPassword = await bcrypt.hash("cambiar123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@criterioasesores.com.py" },
    update: {},
    create: {
      nombre: "Admin Criterio Asesores",
      email: "admin@criterioasesores.com.py",
      password: adminPassword,
      rol: Rol.ADMIN,
    },
  });

  const venceEl = new Date();
  venceEl.setDate(venceEl.getDate() + 30);
  const licenciaExistente = await prisma.licencia.findFirst();
  if (!licenciaExistente) {
    await prisma.licencia.create({
      data: { estado: "ACTIVA", venceEl, features: [] },
    });
  }

  const clientesSeed = [
    {
      nombre: "Plastisur EAS",
      ruc: "80012345-7",
      tipo: TipoCliente.CONTABLE,
      obligaciones: [TipoObligacion.IVA, TipoObligacion.IRE_GENERAL, TipoObligacion.IPS],
    },
    {
      nombre: "Villalba y Asociados",
      ruc: "80023456-3",
      tipo: TipoCliente.JURIDICO,
      obligaciones: [] as TipoObligacion[],
    },
    {
      nombre: "Distribuidora San Roque S.A.",
      ruc: "80034567-9",
      tipo: TipoCliente.AMBOS,
      obligaciones: [TipoObligacion.IVA, TipoObligacion.IRE_SIMPLE, TipoObligacion.MITES],
    },
    {
      nombre: "Comercial Ñandutí S.R.L.",
      ruc: "80045678-1",
      tipo: TipoCliente.CONTABLE,
      obligaciones: [TipoObligacion.IVA, TipoObligacion.EEFF],
    },
  ];

  for (const c of clientesSeed) {
    const cliente = await prisma.cliente.upsert({
      where: { ruc: c.ruc },
      update: {},
      create: {
        nombre: c.nombre,
        ruc: c.ruc,
        tipo: c.tipo,
        responsableId: admin.id,
      },
    });

    for (const tipo of c.obligaciones) {
      await prisma.clienteObligacion.upsert({
        where: { clienteId_tipo: { clienteId: cliente.id, tipo } },
        update: {},
        create: { clienteId: cliente.id, tipo },
      });
    }
  }

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
    const juzgadosSeed: {
      nombre: string;
      circunscripcion: string | null;
      fuero: string | null;
      juezActual: string | null;
      ubicacion: string | null;
      telefono: string | null;
      secretarias: { nombre: string; actuario: string | null; telefono: string | null }[];
    }[] = JSON.parse(readFileSync(rutaJuzgados, "utf-8"));

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

  console.log("Seed OK:", {
    superadmin: superadmin.email,
    admin: admin.email,
    departamentos: DEPARTAMENTOS_SEED.length,
    juzgados: juzgadosCreados,
    secretarias: secretariasCreadas,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
