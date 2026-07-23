"use client";

import { useMemo, useState } from "react";
import { formatFecha } from "@/lib/format";
import { Table, THead, TH, TRow, TD } from "@/components/ui/Table";

export interface ActuacionItem {
  id: string;
  csjId: string | null; // codActuacionCaso, para el link del PDF
  grupoProceso: string | null;
  procesoJudicial: string | null;
  descripcion: string;
  tipo: string | null;
  estado: string | null;
  despacho: string | null;
  fecha: string | null; // ISO
  documentos: { idDocumento: number; descripcion: string }[];
}

// Grupos de proceso de CSJ, con los mismos colores del portal oficial.
const GRUPOS: Record<string, { label: string; bg: string; text: string }> = {
  principal: { label: "Principal", bg: "#DCFCE7", text: "#166534" },
  excepciones: { label: "Excepciones", bg: "#FED7AA", text: "#9A3412" },
  incidentes: { label: "Incidentes", bg: "#CCFBF1", text: "#0F766E" },
  rhp: { label: "R.H.P", bg: "#FEF9C3", text: "#854D0E" },
  recurso: { label: "Recurso", bg: "#FBCFE8", text: "#9D174E" },
  otro: { label: "Otro", bg: "#F1F5F9", text: "#475569" },
};

// Normaliza el texto de CSJ ("R.H.P.", "Recursos"…) a una clave de color.
function claveGrupo(g: string | null): keyof typeof GRUPOS {
  const k = (g ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (k.startsWith("principal")) return "principal";
  if (k.startsWith("excepcion")) return "excepciones";
  if (k.startsWith("incidente")) return "incidentes";
  if (k === "rhp" || k.startsWith("regulacion")) return "rhp";
  if (k.startsWith("recurso")) return "recurso";
  return "otro";
}

export function ActuacionesTabla({
  actuaciones,
  casoId,
  instancia,
}: {
  actuaciones: ActuacionItem[];
  casoId: string | null;
  instancia: string | null;
}) {
  const [filtro, setFiltro] = useState<string | null>(null);
  const pdfHabilitado = !!casoId && !!instancia;

  // Link directo al PDF (abre inline en pestaña nueva, no descarga).
  function pdfHref(a: ActuacionItem, idDocumento: number) {
    return `/api/csj/documento?casoId=${casoId}&instancia=${encodeURIComponent(
      instancia!
    )}&cod=${a.csjId}&id=${idDocumento}`;
  }

  // Grupos presentes (para mostrar solo los chips relevantes), en orden fijo.
  const gruposPresentes = useMemo(() => {
    const orden = ["principal", "excepciones", "incidentes", "rhp", "recurso", "otro"];
    const set = new Set(actuaciones.map((a) => claveGrupo(a.grupoProceso)));
    return orden.filter((g) => set.has(g));
  }, [actuaciones]);

  const visibles = filtro
    ? actuaciones.filter((a) => claveGrupo(a.grupoProceso) === filtro)
    : actuaciones;

  if (actuaciones.length === 0) {
    return <p className="text-sm text-ink-faint">Sin actuaciones importadas.</p>;
  }

  return (
    <div>
      {/* Filtro por grupo de proceso */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip activo={filtro === null} onClick={() => setFiltro(null)}>
          Todos ({actuaciones.length})
        </Chip>
        {gruposPresentes.map((g) => {
          const info = GRUPOS[g];
          const n = actuaciones.filter((a) => claveGrupo(a.grupoProceso) === g).length;
          return (
            <Chip
              key={g}
              activo={filtro === g}
              color={info}
              onClick={() => setFiltro(filtro === g ? null : g)}
            >
              {info.label} ({n})
            </Chip>
          );
        })}
      </div>

      <Table>
        <THead>
          <TH>Proceso</TH>
          <TH>Descripción</TH>
          <TH>Tipo</TH>
          <TH>Fecha</TH>
          {pdfHabilitado && <TH className="text-right">PDF</TH>}
        </THead>
        <tbody>
          {visibles.map((a) => {
            const info = GRUPOS[claveGrupo(a.grupoProceso)];
            return (
              <TRow key={a.id}>
                <TD>
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: info.bg, color: info.text }}
                  >
                    {info.label}
                  </span>
                  {a.procesoJudicial && (
                    <span className="mt-1 block max-w-xs truncate text-xs text-ink-faint" title={a.procesoJudicial}>
                      {a.procesoJudicial}
                    </span>
                  )}
                </TD>
                <TD>
                  {a.descripcion}
                  {a.despacho && (
                    <span className="block text-xs text-ink-faint">{a.despacho}</span>
                  )}
                </TD>
                <TD className="text-ink-muted">
                  {a.tipo ?? "—"}
                  {a.estado && <span className="block text-xs text-ink-faint">{a.estado}</span>}
                </TD>
                <TD className="whitespace-nowrap text-ink-muted">
                  {a.fecha ? formatFecha(a.fecha) : "—"}
                </TD>
                {pdfHabilitado && (
                  <TD className="text-right whitespace-nowrap">
                    {a.documentos.length === 0 ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <span className="inline-flex gap-1">
                        {a.documentos.map((d, i) => (
                          <a
                            key={d.idDocumento}
                            href={pdfHref(a, d.idDocumento)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={d.descripcion}
                            className="rounded-control border border-line px-2 py-1 text-xs font-medium text-primary hover:border-primary"
                          >
                            PDF{a.documentos.length > 1 ? ` ${i + 1}` : ""}
                          </a>
                        ))}
                      </span>
                    )}
                  </TD>
                )}
              </TRow>
            );
          })}
        </tbody>
      </Table>

      {visibles.length === 0 && (
        <p className="mt-3 text-sm text-ink-faint">Sin actuaciones en este grupo.</p>
      )}
    </div>
  );
}

function Chip({
  children,
  activo,
  color,
  onClick,
}: {
  children: React.ReactNode;
  activo: boolean;
  color?: { bg: string; text: string };
  onClick: () => void;
}) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold border transition";
  if (color) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={base}
        style={{
          backgroundColor: activo ? color.bg : "transparent",
          color: activo ? color.text : color.text,
          borderColor: color.bg,
          opacity: activo ? 1 : 0.75,
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${
        activo ? "border-primary bg-primary text-white" : "border-line text-ink-muted"
      }`}
    >
      {children}
    </button>
  );
}
