import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { formatFecha, formatFechaLarga } from "@/lib/format";
import { filtroVencimientosPorRol, TIPO_VENCIMIENTO_META, colorUrgencia, etiquetaVencimiento } from "@/lib/vencimientos";
import { tieneFeature } from "@/lib/licencia";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, StatTile } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ICONS } from "@/components/layout/Icons";
import { CarteraJuridica } from "@/components/dashboard/CarteraJuridica";

export const metadata = { title: "Dashboard — ArandúSoft" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;

  const en7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [clientesActivos, tareasPendientes, proximos, actividad] = await Promise.all([
    prisma.cliente.count({
      where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    }),
    prisma.tarea.count({
      where: { responsableId: user.id, estado: { not: "COMPLETADA" } },
    }),
    prisma.vencimiento.findMany({
      where: {
        estado: "PENDIENTE",
        fechaVencimiento: { gte: new Date(), lte: en7dias },
        ...filtroVencimientosPorRol(user.rol),
      },
      orderBy: { fechaVencimiento: "asc" },
      take: 8,
      include: { cliente: { select: { id: true, nombre: true } } },
    }),
    prisma.notificacion.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, mensaje: true, createdAt: true },
    }),
  ]);
  const vencimientosProximos = proximos.length;
  const criticos = proximos.filter((v) => colorUrgencia(v.fechaVencimiento) === "#DC2626").length;

  const nombre = user.name?.split(" ")[0] ?? "";
  const juridico = await tieneFeature("juridico");

  return (
    <div>
      <PageHeader
        titulo={`Hola, ${nombre}`}
        subtitulo={formatFechaLarga(new Date())}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile
          label="Tareas pendientes"
          value={tareasPendientes}
          icon={ICONS.clipboard}
          tint="#1A2C4E"
          tintBg="rgba(26,44,78,.08)"
        />
        <StatTile
          label="Vencimientos próximos"
          value={vencimientosProximos}
          sub={criticos > 0 ? `${criticos} críticos esta semana` : "sin críticos esta semana"}
          subColor={criticos > 0 ? "#DC2626" : "#64748B"}
          icon={ICONS.calendar}
          tint="#DC2626"
          tintBg="rgba(220,38,38,.08)"
        />
        <StatTile
          label="Clientes activos"
          value={clientesActivos}
          icon={ICONS.users}
          tint="#2563EB"
          tintBg="rgba(37,99,235,.08)"
        />
        <StatTile
          label="Notificaciones"
          value={actividad.length}
          sub="últimos movimientos"
          icon={ICONS.bell}
          tint="#16A34A"
          tintBg="rgba(22,163,74,.08)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5 items-start">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-primary">
              Vencimientos esta semana
            </h3>
            <Link href="/calendario" className="text-sm text-accent hover:underline">
              Ver calendario →
            </Link>
          </div>
          {proximos.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin vencimientos esta semana. 🎉</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {proximos.map((v) => {
                const urg = colorUrgencia(v.fechaVencimiento);
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-[10px] border border-line-soft px-3.5 py-3"
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: urg }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-base truncate">{etiquetaVencimiento(v.tipo, v.descripcion)}</p>
                      <p className="text-xs text-ink-muted truncate">
                        {v.cliente?.nombre ?? "General"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: urg }}>
                      {formatFecha(v.fechaVencimiento, "dd/MM")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-heading font-semibold text-primary mb-4">Actividad reciente</h3>
          {actividad.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin actividad todavía.</p>
          ) : (
            <div className="flex flex-col">
              {actividad.map((a) => (
                <div key={a.id} className="flex gap-3 py-2.5 border-b border-line-soft last:border-0">
                  <Avatar nombre={user.name ?? "?"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-base leading-snug">{a.mensaje}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      {formatFecha(a.createdAt, "dd/MM HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {juridico && <CarteraJuridica rol={user.rol} />}
    </div>
  );
}
