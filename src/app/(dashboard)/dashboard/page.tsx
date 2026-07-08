import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { formatFecha, formatFechaLarga } from "@/lib/format";
import {
  filtroVencimientosPorRol,
  categoriaVencimiento,
  CATEGORIA_COLORES,
} from "@/lib/vencimientos";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, StatTile } from "@/components/ui/Card";

export const metadata = { title: "Dashboard — ArandúSoft" };

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;

  const en7dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [clientesActivos, tareasPendientes, proximos] = await Promise.all([
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
  ]);
  const vencimientosProximos = proximos.length;

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

      <div className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-primary">
              Vencimientos — próximos 7 días
            </h3>
            <Link href="/calendario" className="text-sm text-accent hover:underline">
              Ver calendario →
            </Link>
          </div>
          {proximos.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin vencimientos esta semana. 🎉</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {proximos.map((v) => {
                const cat = CATEGORIA_COLORES[categoriaVencimiento(v.tipo)];
                return (
                  <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="font-medium text-primary w-20 shrink-0">
                      {formatFecha(v.fechaVencimiento, "dd/MM")}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
                      style={{ backgroundColor: cat.bg, color: cat.text }}
                    >
                      {v.tipo}
                    </span>
                    {v.cliente ? (
                      <Link href={`/clientes/${v.cliente.id}`} className="truncate text-ink-base hover:underline">
                        {v.cliente.nombre}
                      </Link>
                    ) : (
                      <span className="text-ink-faint">General</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
