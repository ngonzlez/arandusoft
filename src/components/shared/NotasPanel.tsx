"use client";

import { useEffect, useState } from "react";
import { formatFechaHora } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Nota {
  id: string;
  contenido: string;
  createdAt: string;
  autor: { nombre: string };
}

// Historial de observaciones append-only, reusado por Tareas y Expedientes
// (cada uno pega a su propio endpoint /api/.../[id]/notas).
export function NotasPanel({
  endpoint,
  placeholder = "Escribí una observación...",
}: {
  endpoint: string;
  placeholder?: string;
}) {
  const toast = useToast();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    setCargando(true);
    const res = await fetch(endpoint);
    const json = await res.json().catch(() => null);
    setNotas(json?.data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function agregar() {
    if (!texto.trim()) return;
    setEnviando(true);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: texto.trim() }),
    });

    setEnviando(false);

    if (!res.ok) {
      toast("error", "No se pudo guardar la observación");
      return;
    }

    setTexto("");
    cargar();
  }

  return (
    <div>
      <p className="text-sm font-semibold text-primary mb-2.5">
        Observaciones {notas.length > 0 && `(${notas.length})`}
      </p>

      {cargando ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
          {notas.length === 0 ? (
            <p className="text-xs text-ink-faint">Sin observaciones todavía.</p>
          ) : (
            notas.map((n) => (
              <div key={n.id} className="flex gap-2.5">
                <Avatar nombre={n.autor.nombre} size="sm" />
                <div className="flex-1 min-w-0 rounded-card border border-line bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-ink-base">{n.autor.nombre}</span>
                    <span className="text-[11px] text-ink-faint shrink-0">
                      {formatFechaHora(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-ink-base whitespace-pre-wrap leading-snug">
                    {n.contenido}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 rounded-control border border-line px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
        />
        <Button size="sm" onClick={agregar} disabled={enviando || !texto.trim()}>
          {enviando ? <Spinner className="text-white" /> : "Agregar"}
        </Button>
      </div>
    </div>
  );
}
