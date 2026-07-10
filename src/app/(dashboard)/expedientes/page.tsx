import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpedientesLista } from "@/components/expedientes/ExpedientesLista";

export const metadata = { title: "Expedientes — ArandúSoft" };

export default async function ExpedientesPage() {
  const session = await auth();
  const user = session!.user;

  const juridicoActivo = await tieneFeature("juridico");
  if (!juridicoActivo) redirect("/dashboard");

  const [expedientes, usuarios, clientes] = await Promise.all([
    prisma.expediente.findMany({
      where: { cliente: { ...filtroClientesPorRol(user.rol) } },
      orderBy: { createdAt: "desc" },
      include: {
        cliente: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
        _count: { select: { documentos: true, tareas: true } },
      },
    }),
    prisma.user.findMany({
      where: { activo: true, rol: { not: "SUPERADMIN" } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.cliente.findMany({
      where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  return (
    <div>
      <PageHeader titulo="Expedientes" subtitulo={`${expedientes.length} en total`} />
      <ExpedientesLista
        expedientes={JSON.parse(JSON.stringify(expedientes))}
        usuarios={usuarios}
        clientes={clientes}
        miUserId={user.id}
      />
    </div>
  );
}
