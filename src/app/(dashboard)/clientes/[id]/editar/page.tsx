import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { desencriptar } from "@/lib/crypto";
import type { AccesosCliente } from "@/lib/clientes";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClienteForm } from "@/components/clientes/ClienteForm";

export const metadata = { title: "Editar cliente — ArandúSoft" };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const { id } = await params;

  const cliente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientesPorRol(user.rol) },
    include: {
      obligaciones: { where: { activa: true }, select: { tipo: true, diaVencimiento: true } },
    },
  });
  if (!cliente) notFound();

  const esAdmin = user.rol === "ADMIN";
  let accesos: AccesosCliente | null = null;
  if (esAdmin && cliente.accesos) {
    try {
      accesos = JSON.parse(desencriptar(cliente.accesos));
    } catch {
      accesos = null;
    }
  }

  const usuarios = await prisma.user.findMany({
    where: { activo: true, rol: { not: "SUPERADMIN" } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <div>
      <PageHeader titulo={`Editar: ${cliente.nombre}`} />
      <ClienteForm
        usuarios={usuarios}
        esAdmin={esAdmin}
        clienteId={cliente.id}
        inicial={{
          nombre: cliente.nombre,
          ruc: cliente.ruc,
          cedula: cliente.cedula ?? "",
          telefono: cliente.telefono ?? "",
          email: cliente.email ?? "",
          direccion: cliente.direccion ?? "",
          observaciones: cliente.observaciones ?? "",
          tipo: cliente.tipo,
          estado: cliente.estado,
          estadoFiscal: cliente.estadoFiscal,
          responsableId: cliente.responsableId,
          obligaciones: cliente.obligaciones,
          accesos,
          timbradoNumero: cliente.timbradoNumero ?? "",
          timbradoVencimiento: cliente.timbradoVencimiento?.toISOString().slice(0, 10) ?? "",
          firmaDigitalVencimiento: cliente.firmaDigitalVencimiento?.toISOString().slice(0, 10) ?? "",
        }}
      />
    </div>
  );
}
