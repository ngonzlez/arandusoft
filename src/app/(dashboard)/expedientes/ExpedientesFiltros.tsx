"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ICONS } from "@/components/layout/Icons";
import { ESTADO_EXPEDIENTE_LABELS } from "@/lib/expedientes";

export function ExpedientesFiltros({ anios }: { anios: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Búsqueda con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) setParam("q", q);
    }, 350);
    return () => clearTimeout(t);
  }, [q, searchParams, setParam]);

  const anioActivo = searchParams.get("anio") ?? "";
  const estadoActivo = searchParams.get("estado") ?? "";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          {ICONS.search}
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título o número..."
          className="h-10 w-64 rounded-control border border-line bg-white pl-10 pr-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {anios.length > 0 && (
        <select
          value={anioActivo}
          onChange={(e) => setParam("anio", e.target.value)}
          className="h-10 rounded-control border border-line bg-white px-3 text-sm text-ink-base focus:outline-none focus:border-primary"
        >
          <option value="">Todos los años</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-1.5" title="Movimiento (actuación) entre fechas">
        <span className="text-xs text-ink-muted">Movimiento:</span>
        <input
          type="date"
          value={desde}
          max={hasta || undefined}
          onChange={(e) => setParam("desde", e.target.value)}
          className="h-10 rounded-control border border-line bg-white px-2 text-sm text-ink-base focus:outline-none focus:border-primary"
        />
        <span className="text-xs text-ink-faint">a</span>
        <input
          type="date"
          value={hasta}
          min={desde || undefined}
          onChange={(e) => setParam("hasta", e.target.value)}
          className="h-10 rounded-control border border-line bg-white px-2 text-sm text-ink-base focus:outline-none focus:border-primary"
        />
        {(desde || hasta) && (
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("desde");
              params.delete("hasta");
              router.replace(`${pathname}?${params.toString()}`);
            }}
            className="text-xs text-ink-faint hover:text-urgent px-1"
            title="Limpiar fechas"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setParam("estado", "")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            estadoActivo === ""
              ? "bg-gold text-white"
              : "bg-white border border-line text-ink-muted hover:border-gold/60"
          }`}
        >
          Todos
        </button>
        {Object.entries(ESTADO_EXPEDIENTE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setParam("estado", key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              estadoActivo === key
                ? "bg-gold text-white"
                : "bg-white border border-line text-ink-muted hover:border-gold/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
