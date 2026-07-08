import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { filtroVencimientosPorRol } from "@/lib/vencimientos";
import { TZ_PARAGUAY, formatPeriodo } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, StatTile } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export const metadata = { title: "Reportes — ArandúSoft" };

export default async function ReportesPage() {
  const session = await auth();
  const user = session!.user;

  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");
  const [año, mes] = mesActual.split("-").map(Number);
  const inicioMes = new Date(Date.UTC(año, mes - 1, 1));
  const finMes = new Date(Date.UTC(año, mes, 0, 23, 59, 59));

  const [
    clientesActivos,
    declaracionesMes,
    vencimientosGestionados,
    vencimientosVencidos,
    tareasCompletadasMes,
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
    prisma.tarea.count({
      where: { estado: "COMPLETADA", updatedAt: { gte: inicioMes, lte: finMes } },
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

  return (
    <div>
      <PageHeader titulo="Reportes" subtitulo={formatPeriodo(mesActual)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Clientes activos" value={clientesActivos} />
        <StatTile label="Declaraciones subidas (mes)" value={declaracionesMes} />
        <StatTile
          label="Vencimientos gestionados (mes)"
          value={vencimientosGestionados}
          sub={vencimientosVencidos > 0 ? `${vencimientosVencidos} vencidos sin gestionar` : "sin vencidos"}
          subColor={vencimientosVencidos > 0 ? "#C0344B" : "#2C6E4C"}
        />
        <StatTile label="Tareas completadas (mes)" value={tareasCompletadasMes} />
      </div>

      <div className="mt-6">
        <Card>
          <h3 className="font-heading font-semibold text-primary mb-4">
            Tareas completadas por usuario — {formatPeriodo(mesActual)}
          </h3>
          {tareasPorUsuario.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin usuarios activos.</p>
          ) : (
            <div className="space-y-3">
              {tareasPorUsuario.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar nombre={u.nombre} size="sm" />
                  <span className="text-sm text-ink-base w-44 truncate">{u.nombre}</span>
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
      </div>

      <p className="text-xs text-ink-faint mt-6">
        Reportes con gráficos ampliados (evolución mensual, dona de vencimientos)
        pueden agregarse como mejora post-lanzamiento.
      </p>
    </div>
  );
}
