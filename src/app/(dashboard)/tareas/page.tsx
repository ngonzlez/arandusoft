import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol, filtroTareasPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { PageHeader } from "@/components/layout/PageHeader";
import { TareasBoard } from "@/components/tareas/TareasBoard";

export const metadata = { title: "Tareas — ArandúSoft" };

export default async function TareasPage() {
  const session = await auth();
  const user = session!.user;

  const juridicoActivo = await tieneFeature("juridico");

  const [tareas, usuarios, clientes, expedientes] = await Promise.all([
    prisma.tarea.findMany({
      where: filtroTareasPorRol(user.rol),
      orderBy: [{ prioridad: "asc" }, { fechaLimite: "asc" }],
      include: {
        cliente: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
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
    juridicoActivo
      ? prisma.expediente.findMany({
          where: { cliente: { ...filtroClientesPorRol(user.rol) } },
          orderBy: { titulo: "asc" },
          select: { id: true, titulo: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader titulo="Tareas" subtitulo={`${tareas.length} en total`} />
      <TareasBoard
        tareas={JSON.parse(JSON.stringify(tareas))}
        usuarios={usuarios}
        clientes={clientes}
        expedientes={expedientes}
        miUserId={user.id}
      />
    </div>
  );
}
