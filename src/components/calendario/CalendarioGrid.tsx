"use client";

import { useState } from "react";
import { EstadoVencimiento, TipoVencimiento } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { TZ_PARAGUAY } from "@/lib/format";
import { TIPO_VENCIMIENTO_META } from "@/lib/vencimientos";
import { NuevoVencimientoModal } from "@/components/calendario/NuevoVencimientoModal";

interface VencimientoItem {
  id: string;
  tipo: TipoVencimiento;
  estado: EstadoVencimiento;
  fechaVencimiento: Date;
  cliente: { nombre: string } | null;
}

interface Props {
  año: number;
  mes: number; // 1-12
  vencimientos: VencimientoItem[];
  clientes: { id: string; nombre: string }[];
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const GESTIONADO_STYLE = { bg: "#DCFCE7", text: "#15803D" };

export function CalendarioGrid({ año, mes, vencimientos, clientes }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | undefined>();

  const hoy = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM-dd");
  const diasEnMes = new Date(Date.UTC(año, mes, 0)).getUTCDate();
  // getUTCDay: 0=domingo → offset lunes-primero
  const primerDia = new Date(Date.UTC(año, mes - 1, 1)).getUTCDay();
  const offset = (primerDia + 6) % 7;

  const porDia = new Map<string, VencimientoItem[]>();
  for (const v of vencimientos) {
    const clave = formatInTimeZone(v.fechaVencimiento, TZ_PARAGUAY, "yyyy-MM-dd");
    if (!porDia.has(clave)) porDia.set(clave, []);
    porDia.get(clave)!.push(v);
  }

  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);

  function onDiaClick(clave: string) {
    setFechaSeleccionada(clave);
    setModalAbierto(true);
  }

  return (
    <>
      <div className="bg-white rounded-card border border-line overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line bg-line-soft">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map((dia, i) => {
            if (dia === null) {
              return <div key={i} className="min-h-24 border-b border-r border-line/60 bg-line-soft/40" />;
            }
            const clave = `${año}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const items = porDia.get(clave) ?? [];
            const esHoy = clave === hoy;

            return (
              <button
                key={i}
                onClick={() => onDiaClick(clave)}
                className={`min-h-24 border-b border-r border-line/60 p-1.5 text-left transition-colors hover:bg-line-soft/60 ${
                  esHoy ? "bg-[#FEF3C7]/30" : ""
                }`}
                title="Clic para crear un vencimiento este día"
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    esHoy ? "bg-gold text-white" : "text-ink-muted"
                  }`}
                >
                  {dia}
                </span>
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((v) => {
                    const estilo =
                      v.estado === "GESTIONADO" ? GESTIONADO_STYLE : TIPO_VENCIMIENTO_META[v.tipo];
                    return (
                      <div
                        key={v.id}
                        className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight"
                        style={{ backgroundColor: estilo.bg, color: estilo.text }}
                        title={`${v.tipo} — ${v.cliente?.nombre ?? "General"} (${v.estado})`}
                      >
                        {v.tipo} · {v.cliente?.nombre ?? "General"}
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <p className="text-[10px] text-ink-faint px-1">+{items.length - 3} más</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-line text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#DC2626" }} />
            Urgente / hoy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#D97706" }} />
            Próximo (≤3 días)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#15803D" }} />
            Gestionado
          </span>
          <span className="ml-auto text-ink-faint">Clic en un día para crear un vencimiento</span>
        </div>
      </div>

      <NuevoVencimientoModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        clientes={clientes}
        fechaInicial={fechaSeleccionada}
      />
    </>
  );
}
