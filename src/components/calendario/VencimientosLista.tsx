"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EstadoVencimiento, TipoVencimiento } from "@prisma/client";
import { formatFecha } from "@/lib/format";
import { ESTADO_VENCIMIENTO } from "@/lib/badges";
import { TIPO_VENCIMIENTO_META } from "@/lib/vencimientos";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { NuevoVencimientoModal } from "@/components/calendario/NuevoVencimientoModal";

interface VencimientoItem {
  id: string;
  tipo: TipoVencimiento;
  estado: EstadoVencimiento;
  fechaVencimiento: Date;
  cliente: { id: string; nombre: string } | null;
  responsable: { nombre: string } | null;
}

interface Props {
  vencimientos: VencimientoItem[];
  clientes: { id: string; nombre: string }[];
}

const ESTADO_LABEL: Record<EstadoVencimiento, string> = {
  PENDIENTE: "Pendiente",
  GESTIONADO: "Gestionado",
  VENCIDO: "Vencido",
};

// 🔴 hoy o vencido · 🟡 ≤3 días · 🔵 normal
function urgencia(fecha: Date, estado: EstadoVencimiento): string {
  if (estado === "GESTIONADO") return "";
  const dias = Math.floor((new Date(fecha).getTime() - Date.now()) / 86_400_000);
  if (dias < 1) return "🔴";
  if (dias <= 3) return "🟡";
  return "🔵";
}

export function VencimientosLista({ vencimientos, clientes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [modalNuevo, setModalNuevo] = useState(false);
  const [gestionando, setGestionando] = useState<string | null>(null);

  async function marcarGestionado(id: string) {
    setGestionando(id);
    const res = await fetch(`/api/vencimientos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "GESTIONADO" }),
    });
    setGestionando(null);
    if (!res.ok) {
      toast("error", "No se pudo actualizar");
      return;
    }
    toast("exito", "Vencimiento gestionado");
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-semibold text-primary">
          Listado del mes ({vencimientos.length})
        </h2>
        <Button size="sm" onClick={() => setModalNuevo(true)}>
          + Nuevo vencimiento
        </Button>
      </div>

      {vencimientos.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Sin vencimientos este mes"
            descripcion="Los vencimientos de IVA se generan automáticamente según el RUC. Los demás se cargan manualmente."
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-line-soft">
                {["", "Fecha", "Tipo", "Cliente", "Estado", "Responsable", ""].map((h, i) => (
                  <th
                    key={i}
                    className="py-3 px-3 text-left font-medium text-ink-muted text-xs uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vencimientos.map((v) => {
                const estilo = TIPO_VENCIMIENTO_META[v.tipo];
                return (
                  <tr key={v.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 px-3 w-8">{urgencia(v.fechaVencimiento, v.estado)}</td>
                    <td className="py-2.5 px-3 font-medium text-primary whitespace-nowrap font-mono">
                      {formatFecha(v.fechaVencimiento)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="rounded-md px-2.5 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: estilo.bg, color: estilo.text }}
                      >
                        {v.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {v.cliente ? (
                        <Link href={`/clientes/${v.cliente.id}`} className="text-primary hover:underline">
                          {v.cliente.nombre}
                        </Link>
                      ) : (
                        <span className="text-ink-faint">General</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge style={ESTADO_VENCIMIENTO[v.estado]}>{ESTADO_LABEL[v.estado]}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-ink-muted">{v.responsable?.nombre ?? "—"}</td>
                    <td className="py-2.5 px-3 text-right">
                      {v.estado !== "GESTIONADO" &&
                        (gestionando === v.id ? (
                          <Spinner />
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => marcarGestionado(v.id)}>
                            ✓ Gestionar
                          </Button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NuevoVencimientoModal open={modalNuevo} onClose={() => setModalNuevo(false)} clientes={clientes} />
    </div>
  );
}
