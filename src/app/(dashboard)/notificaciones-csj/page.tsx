import Link from "next/link";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tieneFeature } from "@/lib/licencia";
import { formatFecha, TZ_PARAGUAY, formatPeriodo } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesSelector } from "@/components/estado-mensual/MesSelector";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Cédulas CSJ — ArandúSoft" };

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Bandeja de notificaciones electrónicas (cédulas) traídas de CSJ por el Radar.
// Cada cédula dispara un plazo — es lo que el abogado no puede perder.
export default async function NotificacionesCsjPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  if (!(await tieneFeature("juridico"))) redirect("/dashboard");
  const sp = await searchParams;

  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");
  const mes = MES_RE.test(sp.mes ?? "") ? sp.mes! : mesActual;
  const [año, mesNum] = mes.split("-").map(Number);
  const desde = new Date(Date.UTC(año, mesNum - 1, 1));
  const hasta = new Date(Date.UTC(año, mesNum, 0, 23, 59, 59));

  // Cae por fechaNotificacion cuando existe; si no, por createdAt (llegó al
  // sistema sin fecha de cédula clara — no queremos que desaparezca del filtro).
  const notis = await prisma.notificacionCsj.findMany({
    where: {
      OR: [
        { fechaNotificacion: { gte: desde, lte: hasta } },
        { fechaNotificacion: null, createdAt: { gte: desde, lte: hasta } },
      ],
    },
    orderBy: [{ fechaNotificacion: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: { expediente: { select: { id: true, csjInstancia: true } } },
  });

  const pendientes = notis.filter((n) => !n.revisadoEnCsj).length;

  return (
    <div>
      <PageHeader
        titulo="Cédulas CSJ"
        subtitulo={`${formatPeriodo(mes)} · ${notis.length} notificaciones · ${pendientes} sin revisar`}
        acciones={<MesSelector mes={mes} />}
      />

      {notis.length === 0 ? (
        <EmptyState
          titulo="Sin notificaciones"
          descripcion="Cuando el estudio reciba cédulas electrónicas en CSJ, el Radar las traerá acá automáticamente y te avisará."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line/60">
            {notis.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3">
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.revisadoEnCsj ? "bg-transparent" : "bg-gold"
                  }`}
                  title={n.revisadoEnCsj ? "Revisada" : "Sin revisar"}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">
                    {n.expediente ? (
                      <Link href={`/expedientes/${n.expediente.id}`} className="hover:underline">
                        {n.caratula ?? "Expediente"}
                      </Link>
                    ) : (
                      (n.caratula ?? `Caso ${n.csjCasoId}`)
                    )}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {n.despacho}
                    {n.proceso ? ` · ${n.proceso}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge style={{ bg: "#EFF6FF", text: "#1D4ED8" }}>
                    {n.descripcion ?? "Cédula"}
                  </Badge>
                  <span className="text-xs tabular-nums text-ink-muted">
                    {n.fechaNotificacion ? formatFecha(n.fechaNotificacion) : "—"}
                  </span>
                  {n.expediente && (
                    <Link
                      href={`/expedientes/${n.expediente.id}?plazo=1`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Calcular plazo
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
