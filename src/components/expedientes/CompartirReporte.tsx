"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatFecha } from "@/lib/format";

interface Reporte {
  id: string;
  token: string;
  activo: boolean;
  expiraEl: string | null;
  createdAt: string;
}

export function CompartirReporte({ expedienteId }: { expedienteId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(false);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const url = (t: string) => `${base}/r/${t}`;

  async function abrir() {
    setOpen(true);
    setCargando(true);
    const res = await fetch(`/api/expedientes/${expedienteId}/reportes`);
    const json = await res.json().catch(() => null);
    setCargando(false);
    if (res.ok) setReportes(json.data ?? []);
  }

  async function crear() {
    setCargando(true);
    const res = await fetch(`/api/expedientes/${expedienteId}/reportes`, { method: "POST" });
    const json = await res.json().catch(() => null);
    setCargando(false);
    if (!res.ok) {
      toast("error", json?.error ?? "No se pudo crear el enlace");
      return;
    }
    setReportes((prev) => [json.data, ...prev]);
    await copiar(json.data.token);
  }

  async function copiar(token: string) {
    try {
      await navigator.clipboard.writeText(url(token));
      toast("exito", "Enlace copiado");
    } catch {
      toast("info", url(token));
    }
  }

  async function revocar(reporteId: string) {
    const res = await fetch(`/api/expedientes/${expedienteId}/reportes?reporteId=${reporteId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setReportes((prev) => prev.map((r) => (r.id === reporteId ? { ...r, activo: false } : r)));
      toast("info", "Enlace revocado");
    }
  }

  return (
    <>
      <Button variant="outline" onClick={abrir}>
        Compartir con cliente
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Compartir con el cliente">
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Generá un enlace de solo lectura del estado del expediente para enviarle a tu cliente.
            No expone accesos ni datos internos. Podés revocarlo cuando quieras.
          </p>
          <Button onClick={crear} disabled={cargando}>
            {cargando ? "…" : "Crear enlace"}
          </Button>

          {reportes.length > 0 && (
            <ul className="space-y-2">
              {reportes.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-control border border-line px-3 py-2 text-sm"
                >
                  <span className={`truncate ${r.activo ? "" : "text-ink-faint line-through"}`}>
                    {url(r.token)}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-ink-faint tabular-nums">
                    {formatFecha(r.createdAt)}
                  </span>
                  {r.activo ? (
                    <>
                      <button onClick={() => copiar(r.token)} className="text-xs text-primary hover:underline">
                        Copiar
                      </button>
                      <a href={url(r.token)} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
                        Abrir
                      </a>
                      <button onClick={() => revocar(r.id)} className="text-xs text-urgent hover:underline">
                        Revocar
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-ink-faint">revocado</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
