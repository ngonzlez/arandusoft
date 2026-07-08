import { subDays } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotificacionesLista } from "@/components/notificaciones/NotificacionesLista";

export const metadata = { title: "Notificaciones — ArandúSoft" };

export default async function NotificacionesPage() {
  const session = await auth();
  const user = session!.user;

  const notificaciones = await prisma.notificacion.findMany({
    where: { userId: user.id, createdAt: { gte: subDays(new Date(), 30) } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        titulo="Notificaciones"
        subtitulo="Historial de los últimos 30 días"
      />
      <NotificacionesLista
        notificaciones={notificaciones.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
