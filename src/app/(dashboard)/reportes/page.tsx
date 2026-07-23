import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { filtroVencimientosPorRol } from "@/lib/vencimientos";
import { tieneFeature } from "@/lib/licencia";
import { ReportesJuridicos } from "@/components/reportes/ReportesJuridicos";
import { TZ_PARAGUAY, formatPeriodo, formatFecha } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesSelector } from "@/components/estado-mensual/MesSelector";
import { Card, StatTile } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export const metadata = { title: "Reportes — ArandúSoft" };

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function ReportesPage({
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
  const inicioMes = new Date(Date.UTC(año, mesNum - 1, 1));
  const finMes = new Date(Date.UTC(año, mesNum, 0, 23, 59, 59));

  const [
    clientesActivos,
    declaracionesMes,
    vencimientosGestionados,
    vencimientosVencidos,
    tareasCompletadas,
    tareasPorUsuario,
  ] = await Promise.all([
    prisma.cliente.count({
      where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    }),
    prisma.declaracion.count({
      where: {
        createdAt: { gte: inicioMes, lte: finMes },
        cliente: filtroClientesPorRol(user.rol),
      },
    }),
    prisma.vencimiento.count({
      where: {
        estado: "GESTIONADO",
        fechaVencimiento: { gte: inicioMes, lte: finMes },
        ...filtroVencimientosPorRol(user.rol),
      },
    }),
    prisma.vencimiento.count({
      where: {
        estado: "VENCIDO",
        fechaVencimiento: { gte: inicioMes, lte: finMes },
        ...filtroVencimientosPorRol(user.rol),
      },
    }),
    // Reporte real, no solo el contador: lista de tareas completadas en el período elegido
    prisma.tarea.findMany({
      where: { estado: "COMPLETADA", updatedAt: { gte: inicioMes, lte: finMes } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        titulo: true,
        updatedAt: true,
        cliente: { select: { nombre: true } },
        responsable: { select: { nombre: true } },
      },
    }),
    prisma.user.findMany({
      where: { activo: true, rol: { not: "SUPERADMIN" } },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        _count: {
          select: {
            tareas: {
              where: { estado: "COMPLETADA", updatedAt: { gte: inicioMes, lte: finMes } },
            },
          },
        },
      },
    }),
  ]);

  const maxTareas = Math.max(1, ...tareasPorUsuario.map((u) => u._count.tareas));
  const juridico = await tieneFeature("juridico");

  return (
    <div>
      <PageHeader
        titulo="Reportes"
        subtitulo={formatPeriodo(mes)}
        acciones={<MesSelector mes={mes} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Clientes activos" value={clientesActivos} />
        <StatTile label="Declaraciones subidas" value={declaracionesMes} />
        <StatTile
          label="Vencimientos gestionados"
          value={vencimientosGestionados}
          sub={vencimientosVencidos > 0 ? `${vencimientosVencidos} vencidos sin gestionar` : "sin vencidos"}
          subColor={vencimientosVencidos > 0 ? "#DC2626" : "#15803D"}
        />
        <StatTile label="Tareas completadas" value={tareasCompletadas.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 items-start">
        <Card>
          <h3 className="font-heading font-semibold text-primary mb-4">
            Tareas completadas por usuario
          </h3>
          {tareasPorUsuario.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin usuarios activos.</p>
          ) : (
            <div className="space-y-3">
              {tareasPorUsuario.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar nombre={u.nombre} size="sm" />
                  <span className="text-sm text-ink-base w-32 truncate">{u.nombre}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(u._count.tareas / maxTareas) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-primary w-8 text-right">
                    {u._count.tareas}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-heading font-semibold text-primary mb-4">
            Detalle — tareas completadas ({tareasCompletadas.length})
          </h3>
          {tareasCompletadas.length === 0 ? (
            <p className="text-sm text-ink-faint">Ninguna tarea completada en este período.</p>
          ) : (
            <ul className="divide-y divide-line-soft max-h-80 overflow-y-auto">
              {tareasCompletadas.map((t) => (
                <li key={t.id} className="py-2.5 text-sm">
                  <p className="font-medium text-ink-base">{t.titulo}</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {t.cliente?.nombre ?? "General"} · {t.responsable.nombre} ·{" "}
                    {formatFecha(t.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {juridico && <ReportesJuridicos rol={user.rol} />}

      <p className="text-xs text-ink-faint mt-6">
        Reportes con gráficos ampliados (evolución mensual, dona de vencimientos)
        pueden agregarse como mejora post-lanzamiento.
      </p>
    </div>
  );
}
