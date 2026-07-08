import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClienteForm } from "@/components/clientes/ClienteForm";

export const metadata = { title: "Nuevo cliente — ArandúSoft" };

export default async function NuevoClientePage() {
  const session = await auth();
  const user = session!.user;

  const usuarios = await prisma.user.findMany({
    where: { activo: true, rol: { not: "SUPERADMIN" } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <div>
      <PageHeader titulo="Nuevo cliente" subtitulo="Completá la ficha del cliente" />
      <ClienteForm usuarios={usuarios} esAdmin={user.rol === "ADMIN"} />
    </div>
  );
}
