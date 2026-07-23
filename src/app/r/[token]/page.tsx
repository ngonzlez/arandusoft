import { prisma } from "@/lib/prisma";
import { getConfigEstudio } from "@/lib/licencia";
import { formatFecha } from "@/lib/format";
import { ESTADO_EXPEDIENTE_LABELS, formatNumeroExpediente } from "@/lib/expedientes";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Estado del expediente" };

// Página PÚBLICA (sin login) del reporte compartible. Vista read-only y curada:
// NO expone accesos ni datos sensibles del estudio. Revocable + con vencimiento.
export default async function ReportePublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const reporte = await prisma.reporteExpediente.findUnique({
    where: { token },
    include: {
      expediente: {
        include: {
          materia: { select: { nombre: true } },
          circunscripcion: { select: { nombre: true } },
          intervinientes: { orderBy: { createdAt: "asc" } },
          actuaciones: { orderBy: { fecha: "desc" }, take: 15 },
          vencimientos: {
            where: { tipo: "PLAZO_PROCESAL", estado: "PENDIENTE" },
            orderBy: { fechaVencimiento: "asc" },
          },
        },
      },
    },
  });

  const vencido = reporte?.expiraEl && reporte.expiraEl < new Date();
  if (!reporte || !reporte.activo || vencido) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-lg font-bold text-slate-800">Enlace no disponible</h1>
        <p className="text-sm text-slate-500">
          Este reporte fue revocado o expiró. Solicitá un enlace nuevo al estudio.
        </p>
      </main>
    );
  }

  const e = reporte.expediente;
  const config = await getConfigEstudio();

  return (
    <main className="mx-auto max-w-3xl bg-white p-6 text-slate-800 sm:p-10 print:p-0">
      <header className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {config.nombreEstudio}
          </p>
          <h1 className="mt-1 text-xl font-bold leading-tight">Estado del expediente</h1>
        </div>
        <PrintButton />
      </header>

      <section className="mb-6">
        <h2 className="text-lg font-bold leading-snug">{e.caratula ?? e.titulo}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Dato k="N° / Año" v={formatNumeroExpediente(e.numero, e.anio)} />
          <Dato k="Materia" v={e.materia?.nombre} />
          <Dato k="Circunscripción" v={e.circunscripcion?.nombre} />
          <Dato k="Juzgado" v={e.despachoCsj} />
          <Dato k="Proceso" v={e.proceso} />
          <Dato k="Estado" v={ESTADO_EXPEDIENTE_LABELS[e.estado]} />
        </dl>
      </section>

      {e.intervinientes.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Partes</h3>
          <ul className="space-y-1 text-sm">
            {e.intervinientes.map((p) => (
              <li key={p.id}>
                <span className="text-slate-500">{p.tipoParte ?? "Parte"}:</span> {p.nombre}
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.vencimientos.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Próximos plazos</h3>
          <ul className="space-y-1 text-sm">
            {e.vencimientos.map((v) => (
              <li key={v.id} className="flex justify-between">
                <span>{v.subtipoPlazo ?? "Plazo"}</span>
                <span className="tabular-nums font-medium">{formatFecha(v.fechaVencimiento)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reporte.incluyeActuaciones && e.actuaciones.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Últimas actuaciones
          </h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {e.actuaciones.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="truncate">{a.descripcion}</p>
                  {a.tipo && <p className="text-xs text-slate-400">{a.tipo}</p>}
                </div>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {a.fecha ? formatFecha(a.fecha) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-400">
        Reporte generado el {formatFecha(new Date())} · {config.nombreEstudio}. Información
        referencial del estado del expediente.
      </footer>
    </main>
  );
}

function Dato({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{k}</dt>
      <dd className="font-medium">{v || "—"}</dd>
    </div>
  );
}
