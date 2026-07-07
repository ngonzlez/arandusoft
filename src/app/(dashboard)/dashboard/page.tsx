import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { formatFechaLarga } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatTile } from "@/components/ui/Card";

export const metadata = { title: "Dashboard — ArandúSoft" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;

  const [clientesActivos, tareasPendientes, vencimientosProximos] = await Promise.all([
    prisma.cliente.count({
      where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    }),
    prisma.tarea.count({
      where: { responsableId: user.id, estado: { not: "COMPLETADA" } },
    }),
    prisma.vencimiento.count({
      where: {
        estado: "PENDIENTE",
        fechaVencimiento: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const nombre = user.name?.split(" ")[0] ?? "";

  return (
    <div>
      <PageHeader
        titulo={`Hola, ${nombre}`}
        subtitulo={formatFechaLarga(new Date())}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Clientes activos" value={clientesActivos} />
        <StatTile label="Tareas pendientes" value={tareasPendientes} />
        <StatTile
          label="Vencimientos próximos"
          value={vencimientosProximos}
          sub={vencimientosProximos > 0 ? "en los próximos 7 días" : "sin vencimientos esta semana"}
          subColor={vencimientosProximos > 0 ? "#C0344B" : undefined}
        />
        <StatTile label="Notificaciones" value="—" sub="se completa en Fase 7" />
      </div>

      <p className="text-sm text-ink-faint mt-8">
        Los widgets de vencimientos semanales y actividad reciente se agregan a
        medida que se construyen los módulos.
      </p>
    </div>
  );
}
