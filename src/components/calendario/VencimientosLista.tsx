"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EstadoVencimiento, TipoVencimiento } from "@prisma/client";
import { formatFecha } from "@/lib/format";
import { ESTADO_VENCIMIENTO } from "@/lib/badges";
import { categoriaVencimiento, CATEGORIA_COLORES } from "@/lib/vencimientos";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

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
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function crearVencimiento(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/vencimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: form.get("clienteId") || null,
        tipo: form.get("tipo"),
        fechaVencimiento: `${form.get("fecha")}T12:00:00Z`,
      }),
    });

    const json = await res.json().catch(() => null);
    setGuardando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo crear");
      return;
    }

    toast("exito", "Vencimiento creado");
    setModalNuevo(false);
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
              <tr className="border-b border-line bg-surface/60">
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
                const cat = CATEGORIA_COLORES[categoriaVencimiento(v.tipo)];
                return (
                  <tr key={v.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 px-3 w-8">{urgencia(v.fechaVencimiento, v.estado)}</td>
                    <td className="py-2.5 px-3 font-medium text-primary whitespace-nowrap">
                      {formatFecha(v.fechaVencimiento)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: cat.bg, color: cat.text }}
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

      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo vencimiento">
        <form onSubmit={crearVencimiento} className="space-y-4">
          <Select label="Cliente (opcional)" name="clienteId" defaultValue="">
            <option value="">Sin cliente (general)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Select label="Tipo" name="tipo" defaultValue="IPS" required>
            {Object.values(TipoVencimiento)
              .filter((t) => t !== "PLAZO_PROCESAL") // Fase 2 jurídico
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </Select>
          <Input label="Fecha de vencimiento" name="fecha" type="date" required />

          {error && (
            <p className="rounded-control bg-[#FBE9EC] px-3 py-2 text-sm text-urgent">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalNuevo(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner className="text-white" /> : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
