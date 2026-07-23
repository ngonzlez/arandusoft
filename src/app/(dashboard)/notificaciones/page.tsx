import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TZ_PARAGUAY, formatPeriodo } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesSelector } from "@/components/estado-mensual/MesSelector";
import { NotificacionesLista } from "@/components/notificaciones/NotificacionesLista";

export const metadata = { title: "Notificaciones — ArandúSoft" };

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const sp = await searchParams;

  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");
  const mes = MES_RE.test(sp.mes ?? "") ? sp.mes! : mesActual;
  const [año, mesNum] = mes.split("-").map(Number);
  const desde = new Date(Date.UTC(año, mesNum - 1, 1));
  const hasta = new Date(Date.UTC(año, mesNum, 0, 23, 59, 59));

  const notificaciones = await prisma.notificacion.findMany({
    where: { userId: user.id, createdAt: { gte: desde, lte: hasta } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        titulo="Notificaciones"
        subtitulo={formatPeriodo(mes)}
        acciones={<MesSelector mes={mes} />}
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
