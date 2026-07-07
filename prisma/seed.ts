import { PrismaClient, Rol, TipoCliente, TipoObligacion } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
      data: { estado: "ACTIVA", venceEl },
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

  console.log("Seed OK:", { superadmin: superadmin.email, admin: admin.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
