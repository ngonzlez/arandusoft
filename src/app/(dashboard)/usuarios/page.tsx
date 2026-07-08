import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { EquipoGrid } from "@/components/usuarios/EquipoGrid";

export const metadata = { title: "Equipo — ArandúSoft" };

export default async function UsuariosPage() {
  const session = await auth();
  const user = session!.user;
  if (user.rol !== "ADMIN") redirect("/dashboard");

  const usuarios = await prisma.user.findMany({
    where: { rol: { not: "SUPERADMIN" } },
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      _count: {
        select: { tareas: { where: { estado: { not: "COMPLETADA" } } } },
      },
    },
  });

  return (
    <div>
      <PageHeader
        titulo="Equipo"
        subtitulo={`${usuarios.filter((u) => u.activo).length} usuarios activos`}
      />
      <EquipoGrid
        usuarios={usuarios.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
          activo: u.activo,
          tareasActivas: u._count.tareas,
        }))}
        miUserId={user.id}
      />
    </div>
  );
}
