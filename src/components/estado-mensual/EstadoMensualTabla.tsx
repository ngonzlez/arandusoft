"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EstadoObligacion, TipoObligacion } from "@prisma/client";
import { OBLIGACIONES_LABELS } from "@/lib/clientes";
import { formatFechaHora } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface EstadoCelda {
  obligacion: TipoObligacion;
  estado: EstadoObligacion;
  fechaPresentacion: string | Date | null;
  responsable: { nombre: string } | null;
}

interface ClienteFila {
  id: string;
  nombre: string;
  ruc: string;
  obligaciones: { tipo: TipoObligacion }[];
  estadosMensuales: EstadoCelda[];
}

interface Props {
  mes: string;
  clientes: ClienteFila[];
}

// Semáforo visual (prototipo): verde presentado, amarillo pendiente, rojo vencido.
const ICONO: Record<EstadoObligacion, { simbolo: string; clase: string; label: string }> = {
  PRESENTADO: { simbolo: "✓", clase: "bg-[#DCFCE7] text-[#15803D]", label: "Presentado" },
  PENDIENTE: { simbolo: "⏳", clase: "bg-[#FEF3C7] text-[#A16207]", label: "Pendiente" },
  VENCIDO: { simbolo: "✕", clase: "bg-[#FEE2E2] text-[#DC2626]", label: "Vencido" },
  NO_APLICA: { simbolo: "—", clase: "bg-[#F1F5F9] text-[#64748B]", label: "No aplica" },
};

export function EstadoMensualTabla({ mes, clientes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [celda, setCelda] = useState<{ cliente: ClienteFila; obligacion: TipoObligacion } | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Columnas = unión de obligaciones activas de los clientes visibles, en orden fijo del enum
  const columnas = useMemo(() => {
    const activas = new Set<TipoObligacion>();
    clientes.forEach((c) => c.obligaciones.forEach((o) => activas.add(o.tipo)));
    return Object.values(TipoObligacion).filter((t) => activas.has(t));
  }, [clientes]);

  function estadoDe(cliente: ClienteFila, obligacion: TipoObligacion): EstadoCelda | null {
    return cliente.estadosMensuales.find((e) => e.obligacion === obligacion) ?? null;
  }

  async function cambiarEstado(estado: EstadoObligacion) {
    if (!celda) return;
    setGuardando(true);

    const res = await fetch("/api/estado-mensual", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: celda.cliente.id,
        mes,
        obligacion: celda.obligacion,
        estado,
      }),
    });

    setGuardando(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast("error", json?.error ?? "Error al guardar");
      return;
    }

    toast("exito", `${OBLIGACIONES_LABELS[celda.obligacion]} → ${ICONO[estado].label}`);
    setCelda(null);
    router.refresh();
  }

  const detalle = celda ? estadoDe(celda.cliente, celda.obligacion) : null;

  return (
    <>
      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60">
              <th className="text-left py-3 px-4 font-medium text-ink-muted text-xs uppercase tracking-wide sticky left-0 bg-surface/60 min-w-48">
                Cliente
              </th>
              {columnas.map((col) => (
                <th
                  key={col}
                  className="py-3 px-2 font-medium text-ink-muted text-xs uppercase tracking-wide text-center whitespace-nowrap"
                >
                  {OBLIGACIONES_LABELS[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0">
                <td className="py-2.5 px-4 sticky left-0 bg-white">
                  <Link href={`/clientes/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.nombre}
                  </Link>
                  <p className="text-xs text-ink-faint">{c.ruc}</p>
                </td>
                {columnas.map((col) => {
                  const aplica = c.obligaciones.some((o) => o.tipo === col);
                  if (!aplica) {
                    return (
                      <td key={col} className="py-2.5 px-2 text-center text-ink-faint/40">
                        ·
                      </td>
                    );
                  }
                  const est = estadoDe(c, col);
                  const icono = ICONO[est?.estado ?? "PENDIENTE"];
                  return (
                    <td key={col} className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => setCelda({ cliente: c, obligacion: col })}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-transform hover:scale-110 ${icono.clase}`}
                        title={`${OBLIGACIONES_LABELS[col]}: ${icono.label}`}
                      >
                        {icono.simbolo}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!celda}
        onClose={() => setCelda(null)}
        title={celda ? `${celda.cliente.nombre} — ${OBLIGACIONES_LABELS[celda.obligacion]}` : ""}
      >
        {celda && (
          <div className="space-y-4">
            <div className="rounded-control bg-surface px-4 py-3 text-sm">
              <p>
                <span className="text-ink-muted">Estado actual: </span>
                <span className="font-medium">{ICONO[detalle?.estado ?? "PENDIENTE"].label}</span>
              </p>
              {detalle?.fechaPresentacion && (
                <p className="mt-1">
                  <span className="text-ink-muted">Presentado: </span>
                  <span className="font-medium">{formatFechaHora(detalle.fechaPresentacion)}</span>
                  {detalle.responsable && (
                    <span className="text-ink-muted"> por {detalle.responsable.nombre}</span>
                  )}
                </p>
              )}
            </div>

            <p className="text-xs text-ink-muted">
              Al marcar como presentado se registra tu usuario y la fecha/hora. El
              PDF de la declaración se adjunta desde el módulo Declaraciones (Fase 4).
            </p>

            {guardando ? (
              <div className="flex justify-center py-2">
                <Spinner />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => cambiarEstado("PRESENTADO")}>✓ Presentado</Button>
                <Button variant="outline" onClick={() => cambiarEstado("PENDIENTE")}>
                  ⏳ Pendiente
                </Button>
                <Button variant="danger" onClick={() => cambiarEstado("VENCIDO")}>
                  ✕ Vencido
                </Button>
                <Button variant="ghost" onClick={() => cambiarEstado("NO_APLICA")}>
                  — No aplica
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
