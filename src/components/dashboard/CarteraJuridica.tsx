import Link from "next/link";
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroExpedientesPorRol } from "@/lib/api-auth";
import { formatFecha } from "@/lib/format";
import { colorUrgencia } from "@/lib/vencimientos";
import { Card, StatTile } from "@/components/ui/Card";
import { ICONS } from "@/components/layout/Icons";

const DIAS_SIN_MOVIMIENTO = 30;

// Sección "Cartera jurídica" del dashboard (solo con feature juridico).
// Señales derivadas de los datos CSJ: plazos por vencer, para impulsar
// (sin movimiento), actuación nueva sin revisar.
export async function CarteraJuridica({ rol }: { rol: Rol }) {
  const ahora = new Date();
  const en7dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const corteSinMov = new Date(ahora.getTime() - DIAS_SIN_MOVIMIENTO * 24 * 60 * 60 * 1000);

  const [expedientes, plazos] = await Promise.all([
    prisma.expediente.findMany({
      where: { origenCsj: true, ...filtroExpedientesPorRol(rol) },
      select: {
        id: true,
        titulo: true,
        caratula: true,
        actuacionesRevisadasAt: true,
        actuaciones: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true, descripcion: true } },
      },
    }),
    prisma.vencimiento.findMany({
      where: {
        tipo: "PLAZO_PROCESAL",
        estado: "PENDIENTE",
        fechaVencimiento: { gte: ahora, lte: en7dias },
      },
      orderBy: { fechaVencimiento: "asc" },
      take: 8,
      include: { expediente: { select: { id: true, caratula: true, titulo: true } } },
    }),
  ]);

  const total = expedientes.length;
  const conActuacionNueva = expedientes.filter((e) => {
    const ultima = e.actuaciones[0]?.fecha;
    if (!ultima) return false;
    return !e.actuacionesRevisadasAt || ultima > e.actuacionesRevisadasAt;
  });
  const paraImpulsar = expedientes.filter((e) => {
    const ultima = e.actuaciones[0]?.fecha;
    return !ultima || ultima < corteSinMov;
  });

  if (total === 0) return null; // sin expedientes CSJ → no mostrar la sección

  return (
    <div className="mt-6">
      <h2 className="mb-3 font-heading text-base font-bold text-primary">Cartera jurídica</h2>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="Expedientes CSJ" value={total} icon={ICONS.folder} tint="#2563EB" tintBg="rgba(37,99,235,.08)" />
        <StatTile
          label="Plazos por vencer"
          value={plazos.length}
          sub="próximos 7 días"
          subColor={plazos.length > 0 ? "#DC2626" : "#64748B"}
          icon={ICONS.calendar}
          tint="#DC2626"
          tintBg="rgba(220,38,38,.08)"
        />
        <StatTile
          label="Para impulsar"
          value={paraImpulsar.length}
          sub={`sin movimiento +${DIAS_SIN_MOVIMIENTO}d`}
          subColor={paraImpulsar.length > 0 ? "#D97706" : "#64748B"}
          icon={ICONS.clipboard}
          tint="#D97706"
          tintBg="rgba(217,119,6,.08)"
        />
        <StatTile
          label="Actuación nueva"
          value={conActuacionNueva.length}
          sub="sin revisar"
          subColor={conActuacionNueva.length > 0 ? "#16A34A" : "#64748B"}
          icon={ICONS.bell}
          tint="#16A34A"
          tintBg="rgba(22,163,74,.08)"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading font-semibold text-primary">Plazos por vencer</h3>
            <Link href="/calendario" className="text-sm text-accent hover:underline">Ver calendario →</Link>
          </div>
          {plazos.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin plazos próximos. 🎉</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {plazos.map((p) => {
                const urg = colorUrgencia(p.fechaVencimiento);
                return (
                  <Link
                    key={p.id}
                    href={p.expediente ? `/expedientes/${p.expediente.id}` : "/calendario"}
                    className="flex items-center gap-3 rounded-[10px] border border-line-soft px-3.5 py-3 hover:border-gold/60"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: urg }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-base">
                        {p.subtipoPlazo ?? "Plazo"} — {p.expediente?.caratula ?? p.expediente?.titulo ?? "expediente"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: urg }}>
                      {formatFecha(p.fechaVencimiento, "dd/MM")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-heading font-semibold text-primary">Requieren atención</h3>
          {conActuacionNueva.length === 0 && paraImpulsar.length === 0 ? (
            <p className="text-sm text-ink-faint">Cartera al día. 🎉</p>
          ) : (
            <div className="flex flex-col">
              {conActuacionNueva.slice(0, 6).map((e) => (
                <Link
                  key={e.id}
                  href={`/expedientes/${e.id}`}
                  className="flex items-center gap-2 border-b border-line-soft py-2.5 last:border-0 hover:opacity-80"
                >
                  <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#166534]">nueva</span>
                  <span className="truncate text-sm text-ink-base">{e.caratula ?? e.titulo}</span>
                </Link>
              ))}
              {paraImpulsar.slice(0, 6).map((e) => (
                <Link
                  key={e.id}
                  href={`/expedientes/${e.id}`}
                  className="flex items-center gap-2 border-b border-line-soft py-2.5 last:border-0 hover:opacity-80"
                >
                  <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#92400E]">impulsar</span>
                  <span className="truncate text-sm text-ink-base">{e.caratula ?? e.titulo}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
