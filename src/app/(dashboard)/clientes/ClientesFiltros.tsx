"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ICONS } from "@/components/layout/Icons";

const TIPOS = [
  { key: "", label: "Todos" },
  { key: "CONTABLE", label: "Contable" },
  { key: "JURIDICO", label: "Jurídico" },
  { key: "AMBOS", label: "Mixto" },
];

const ESTADOS = [
  { key: "", label: "Todos" },
  { key: "ACTIVO", label: "Activos" },
  { key: "PROSPECTO", label: "Prospectos" },
  { key: "INACTIVO", label: "Inactivos" },
];

export function ClientesFiltros({ mostrarTipos }: { mostrarTipos: boolean }) {
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

  const tipoActivo = searchParams.get("tipo") ?? "";
  const estadoActivo = searchParams.get("estado") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          {ICONS.search}
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente o RUC..."
          className="h-10 w-64 rounded-control border border-line bg-white pl-10 pr-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {mostrarTipos && (
        <div className="flex gap-1">
          {TIPOS.map((t) => (
            <button
              key={t.key}
              onClick={() => setParam("tipo", t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tipoActivo === t.key
                  ? "bg-primary text-white"
                  : "bg-white border border-line text-ink-muted hover:border-primary/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1">
        {ESTADOS.map((e) => (
          <button
            key={e.key}
            onClick={() => setParam("estado", e.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              estadoActivo === e.key
                ? "bg-gold text-white"
                : "bg-white border border-line text-ink-muted hover:border-gold/60"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}
