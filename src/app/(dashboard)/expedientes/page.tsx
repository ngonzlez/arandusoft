import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol, filtroExpedientesPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpedientesLista } from "@/components/expedientes/ExpedientesLista";

export const metadata = { title: "Expedientes — ArandúSoft" };

export default async function ExpedientesPage() {
  const session = await auth();
  const user = session!.user;

  const juridicoActivo = await tieneFeature("juridico");
  if (!juridicoActivo) redirect("/dashboard");

  const [expedientes, usuarios, clientes, departamentos, juzgados] = await Promise.all([
    prisma.expediente.findMany({
      where: { ...filtroExpedientesPorRol(user.rol) },
      orderBy: { createdAt: "desc" },
      include: {
        cliente: { select: { id: true, nombre: true } },
        juzgado: { select: { id: true, nombre: true } },
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
    prisma.departamento.findMany({
      orderBy: { nombre: "asc" },
      include: { ciudades: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true } } },
    }),
    prisma.juzgado.findMany({
      where: { activo: true },
      orderBy: [{ circunscripcion: "asc" }, { nombre: "asc" }],
      include: { secretarias: { where: { activo: true }, orderBy: { nombre: "asc" } } },
    }),
  ]);

  return (
    <div>
      <PageHeader titulo="Expedientes" subtitulo={`${expedientes.length} en total`} />
      <ExpedientesLista
        expedientes={JSON.parse(JSON.stringify(expedientes))}
        usuarios={usuarios}
        clientes={clientes}
        departamentos={JSON.parse(JSON.stringify(departamentos))}
        juzgados={JSON.parse(JSON.stringify(juzgados))}
        miUserId={user.id}
      />
    </div>
  );
}
