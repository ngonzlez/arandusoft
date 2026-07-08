"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { AccesosCliente } from "@/lib/clientes";

const SISTEMAS: { key: keyof AccesosCliente; label: string }[] = [
  { key: "marangatu", label: "Marangatu" },
  { key: "set", label: "SET" },
  { key: "ips", label: "IPS" },
  { key: "mites", label: "MITES" },
];

// Solo se monta para ADMIN (el server component ya filtró).
// Las claves arrancan ocultas y se revelan por clic.
export function AccesosPanel({ accesos }: { accesos: AccesosCliente | null }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const tieneAlgo =
    accesos &&
    (SISTEMAS.some((s) => (accesos[s.key] as { usuario?: string })?.usuario) ||
      accesos.otros);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-heading font-semibold text-primary">Accesos internos</h3>
        <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
          SOLO ADMIN
        </span>
      </div>

      {!tieneAlgo ? (
        <p className="text-sm text-ink-faint">Sin accesos cargados.</p>
      ) : (
        <div className="space-y-2 text-sm">
          {SISTEMAS.map((s) => {
            const cred = accesos?.[s.key] as { usuario?: string; clave?: string } | undefined;
            if (!cred?.usuario) return null;
            return (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="text-ink-muted w-24">{s.label}</span>
                <span className="font-medium flex-1">{cred.usuario}</span>
                <button
                  onClick={() =>
                    setVisible((prev) => ({ ...prev, [s.key]: !prev[s.key] }))
                  }
                  className="text-xs text-accent hover:underline"
                >
                  {visible[s.key] ? cred.clave || "—" : "Ver clave"}
                </button>
              </div>
            );
          })}
          {accesos?.otros && (
            <div className="flex items-start justify-between gap-3 pt-1 border-t border-line">
              <span className="text-ink-muted w-24">Otros</span>
              <span className="flex-1 text-ink-base">{accesos.otros}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
