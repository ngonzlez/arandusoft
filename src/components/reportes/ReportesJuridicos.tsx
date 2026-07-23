import Link from "next/link";
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroExpedientesPorRol } from "@/lib/api-auth";
import { ESTADO_EXPEDIENTE_LABELS } from "@/lib/expedientes";
import { formatFecha } from "@/lib/format";
import { Card, StatTile } from "@/components/ui/Card";
import { ICONS } from "@/components/layout/Icons";

const DIAS_SIN_MOVIMIENTO = 30;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Sección jurídica de /reportes: estadísticas de la cartera CSJ + reportes
// públicos compartidos. Se muestra solo con feature juridico.
export async function ReportesJuridicos({ rol }: { rol: Rol }) {
  const ahora = new Date();
  const en7dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const corteSinMov = new Date(ahora.getTime() - DIAS_SIN_MOVIMIENTO * 24 * 60 * 60 * 1000);
  const seisMesesAtras = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);
  const filtroExp = { origenCsj: true, ...filtroExpedientesPorRol(rol) };

  const [expedientes, plazos, conSentencia, porEstado, reportes, actsSeis] = await Promise.all([
    prisma.expediente.findMany({
      where: filtroExp,
      select: { id: true, actuaciones: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } } },
    }),
    prisma.vencimiento.count({
      where: { tipo: "PLAZO_PROCESAL", estado: "PENDIENTE", fechaVencimiento: { gte: ahora, lte: en7dias } },
    }),
    prisma.expediente.count({
      where: { ...filtroExp, actuaciones: { some: { descripcion: { contains: "sentencia", mode: "insensitive" } } } },
    }),
    prisma.expediente.groupBy({ by: ["estado"], where: filtroExp, _count: { _all: true } }),
    prisma.reporteExpediente.findMany({
      where: { activo: true, expediente: filtroExpedientesPorRol(rol) },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { expediente: { select: { caratula: true, titulo: true } } },
    }),
    prisma.actuacion.findMany({
      where: { fecha: { gte: seisMesesAtras }, expediente: filtroExp },
      select: { fecha: true },
    }),
  ]);

  const total = expedientes.length;
  if (total === 0 && reportes.length === 0) return null;

  const paraImpulsar = expedientes.filter((e) => {
    const u = e.actuaciones[0]?.fecha;
    return !u || u < corteSinMov;
  }).length;

  // Actividad procesal: actuaciones por mes (últimos 6 meses).
  const buckets: { label: string; key: string; n: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    buckets.push({ label: MESES[d.getMonth()], key: `${d.getFullYear()}-${d.getMonth()}`, n: 0 });
  }
  for (const a of actsSeis) {
    if (!a.fecha) continue;
    const k = `${a.fecha.getFullYear()}-${a.fecha.getMonth()}`;
    const b = buckets.find((x) => x.key === k);
    if (b) b.n++;
  }
  const maxAct = Math.max(1, ...buckets.map((b) => b.n));
  const maxEstado = Math.max(1, ...porEstado.map((e) => e._count._all));

  return (
    <div className="mt-8">
      <h2 className="mb-3 font-heading text-base font-bold text-primary">Cartera jurídica (CSJ)</h2>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="Total expedientes" value={total} icon={ICONS.folder} tint="#2563EB" tintBg="rgba(37,99,235,.08)" />
        <StatTile label="Plazos por vencer" value={plazos} sub="próximos 7 días" subColor={plazos > 0 ? "#DC2626" : "#64748B"} icon={ICONS.calendar} tint="#DC2626" tintBg="rgba(220,38,38,.08)" />
        <StatTile label="Para impulsar" value={paraImpulsar} sub={`sin movimiento +${DIAS_SIN_MOVIMIENTO}d`} subColor={paraImpulsar > 0 ? "#D97706" : "#64748B"} icon={ICONS.clipboard} tint="#D97706" tintBg="rgba(217,119,6,.08)" />
        <StatTile label="Con sentencia" value={conSentencia} icon={ICONS.check} tint="#16A34A" tintBg="rgba(22,163,74,.08)" />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Actividad procesal */}
        <Card>
          <h3 className="mb-4 font-heading font-semibold text-primary">Actividad procesal</h3>
          <p className="-mt-3 mb-3 text-xs text-ink-faint">Actuaciones por mes (últimos 6 meses)</p>
          <div className="flex h-40 items-end gap-2">
            {buckets.map((b) => (
              <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-ink-muted">{b.n}</span>
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${(b.n / maxAct) * 100}%`, minHeight: b.n > 0 ? 4 : 0 }}
                />
                <span className="text-xs text-ink-faint">{b.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Distribución por estado */}
        <Card>
          <h3 className="mb-4 font-heading font-semibold text-primary">Distribución por estado</h3>
          {porEstado.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin expedientes.</p>
          ) : (
            <div className="space-y-3">
              {porEstado.map((e) => (
                <div key={e.estado} className="flex items-center gap-3">
                  <span className="w-28 truncate text-sm text-ink-base">{ESTADO_EXPEDIENTE_LABELS[e.estado]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(e._count._all / maxEstado) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-medium tabular-nums text-primary">{e._count._all}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Reportes públicos compartidos */}
      <div className="mt-4">
      <Card>
        <h3 className="mb-4 font-heading font-semibold text-primary">Reportes compartidos con clientes</h3>
        {reportes.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Todavía no compartiste ningún expediente. Entrá a un expediente → “Compartir con cliente”.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {reportes.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{r.expediente.caratula ?? r.expediente.titulo}</span>
                <span className="shrink-0 text-xs tabular-nums text-ink-faint">{formatFecha(r.createdAt)}</span>
                <Link href={`/r/${r.token}`} target="_blank" rel="noopener" className="shrink-0 text-xs text-primary hover:underline">
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
    </div>
  );
}
