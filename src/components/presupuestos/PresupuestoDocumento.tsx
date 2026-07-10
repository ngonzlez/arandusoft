import { formatFecha } from "@/lib/format";
import {
  formatNumeroPresupuesto,
  formatMonto,
  type ItemPresupuesto,
} from "@/lib/presupuestos";

interface Emisor {
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  tieneLogo: boolean;
  logoVersion: string;
}

interface Doc {
  estado: "BORRADOR" | "EMITIDO" | "ANULADO";
  numero: number | null;
  anio: number | null;
  destNombre: string;
  destRuc: string | null;
  destDireccion: string | null;
  destTelefono: string | null;
  destEmail: string | null;
  fechaEmision: string | Date;
  validezDias: number;
  serviciosIncluidos: string | null;
  items: ItemPresupuestos[];
  descuento: number;
  subtotal: number;
  total: number;
  notas: string | null;
  datosBancarios: string | null;
  firmaDataUrl: string | null;
  firmante: string | null;
}

type ItemPresupuestos = ItemPresupuesto;

// Documento A4 imprimible. Server component — recibe todo por props.
export function PresupuestoDocumento({ doc, emisor }: { doc: Doc; emisor: Emisor }) {
  const numero =
    doc.numero != null && doc.anio != null
      ? formatNumeroPresupuesto(doc.numero, doc.anio)
      : null;

  return (
    <div className="relative max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-10 print:p-0">
      {/* Marca de agua ANULADO */}
      {doc.estado === "ANULADO" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="rotate-[-30deg] text-7xl font-heading font-bold text-urgent/20 border-4 border-urgent/20 rounded-xl px-8 py-3">
            ANULADO
          </span>
        </div>
      )}

      {/* Banda BORRADOR */}
      {doc.estado === "BORRADOR" && (
        <div className="mb-6 rounded-control bg-[#FEF3C7] px-4 py-2 text-center text-sm font-semibold text-[#A16207]">
          BORRADOR — sin número asignado
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-gold pb-6">
        <div className="flex items-center gap-4">
          {emisor.tieneLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/estudio/logo?v=${encodeURIComponent(emisor.logoVersion)}`}
              alt=""
              className="h-16 w-auto object-contain"
            />
          )}
          <div>
            <p className="font-heading text-lg font-bold text-primary">{emisor.nombre}</p>
            {emisor.ruc && <p className="text-xs text-ink-muted">RUC: {emisor.ruc}</p>}
            {(emisor.direccion || emisor.ciudad) && (
              <p className="text-xs text-ink-muted">
                {[emisor.direccion, emisor.ciudad].filter(Boolean).join(" — ")}
              </p>
            )}
            {(emisor.telefono || emisor.email) && (
              <p className="text-xs text-ink-muted">
                {[emisor.telefono, emisor.email].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-heading text-2xl font-bold text-primary tracking-wide">PRESUPUESTO</p>
          {numero && <p className="font-mono text-sm text-ink-muted mt-1">N° {numero}</p>}
        </div>
      </div>

      {/* Fecha + validez + destinatario */}
      <div className="flex justify-between gap-6 py-6">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-faint mb-1">Para</p>
          <p className="text-sm font-semibold text-ink-base">{doc.destNombre}</p>
          {doc.destRuc && <p className="text-xs text-ink-muted">RUC/CI: {doc.destRuc}</p>}
          {doc.destDireccion && <p className="text-xs text-ink-muted">{doc.destDireccion}</p>}
          {(doc.destTelefono || doc.destEmail) && (
            <p className="text-xs text-ink-muted">
              {[doc.destTelefono, doc.destEmail].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right text-sm shrink-0">
          <p>
            <span className="text-ink-muted">Fecha de emisión: </span>
            <span className="font-medium">{formatFecha(doc.fechaEmision)}</span>
          </p>
          <p className="mt-1">
            <span className="text-ink-muted">Validez: </span>
            <span className="font-medium">{doc.validezDias} días</span>
          </p>
        </div>
      </div>

      {/* Servicios incluidos */}
      {doc.serviciosIncluidos && (
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-wide text-ink-faint mb-2">Servicios incluidos</p>
          <ul className="space-y-1">
            {doc.serviciosIncluidos
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean)
              .map((linea, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-base">
                  <span className="text-gold-dark mt-0.5">•</span>
                  <span>{linea}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Ítems */}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary text-white">
            <th className="text-left py-2.5 px-3 font-medium rounded-l-md">Descripción</th>
            <th className="text-center py-2.5 px-2 font-medium w-16">Cant.</th>
            <th className="text-center py-2.5 px-2 font-medium w-20">Unidad</th>
            <th className="text-right py-2.5 px-3 font-medium w-32">Precio unit.</th>
            <th className="text-right py-2.5 px-3 font-medium w-32 rounded-r-md">Total</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={it.id ?? i} className={i % 2 === 1 ? "bg-surface" : ""}>
              <td className="py-2.5 px-3">
                <p className="font-medium text-ink-base">{it.descripcion}</p>
                {it.detalle && <p className="text-xs text-ink-muted mt-0.5">{it.detalle}</p>}
              </td>
              <td className="py-2.5 px-2 text-center">{it.cantidad}</td>
              <td className="py-2.5 px-2 text-center text-ink-muted">{it.unidad ?? "—"}</td>
              <td className="py-2.5 px-3 text-right">{formatMonto(it.precioUnitario)}</td>
              <td className="py-2.5 px-3 text-right font-medium">
                {formatMonto(Math.round(it.cantidad * it.precioUnitario))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="flex justify-end mt-4">
        <div className="w-72 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Subtotal</span>
            <span className="font-medium">{formatMonto(doc.subtotal)}</span>
          </div>
          {doc.descuento > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-muted">Descuento</span>
              <span className="font-medium">− {formatMonto(doc.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline border-t-2 border-primary pt-2 mt-2">
            <span className="font-heading font-bold text-primary">TOTAL</span>
            <span className="font-heading text-xl font-bold text-gold-dark">
              {formatMonto(doc.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Notas + datos bancarios */}
      {(doc.notas || doc.datosBancarios) && (
        <div className="grid grid-cols-2 gap-6 mt-8 text-sm">
          {doc.notas ? (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-faint mb-1.5">Notas</p>
              <p className="text-ink-muted whitespace-pre-wrap leading-relaxed text-xs">{doc.notas}</p>
            </div>
          ) : (
            <div />
          )}
          {doc.datosBancarios && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-faint mb-1.5">Datos bancarios</p>
              <p className="text-ink-muted whitespace-pre-wrap leading-relaxed text-xs">{doc.datosBancarios}</p>
            </div>
          )}
        </div>
      )}

      {/* Firma */}
      {(doc.firmaDataUrl || doc.firmante) && (
        <div className="mt-12 flex justify-end">
          <div className="text-center">
            {doc.firmaDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.firmaDataUrl} alt="" className="max-h-16 mx-auto mb-1" />
            )}
            <div className="border-t border-ink-base w-56 pt-1.5">
              <p className="text-xs font-medium text-ink-base">{doc.firmante ?? ""}</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 border-t border-line pt-4 text-center text-[10px] text-ink-faint">
        {[emisor.nombre, emisor.telefono, emisor.email, [emisor.direccion, emisor.ciudad].filter(Boolean).join(", ")]
          .filter(Boolean)
          .join("   ·   ")}
      </div>
    </div>
  );
}
