"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { formatFechaHora } from "@/lib/format";

interface AuditoriaCelda {
  userId: string;
  at: string;
}

interface RegistroAsamblea {
  fechaEEFF: string | Date | null;
  asambleaSolicitada: boolean;
  asambleaConfirmada: boolean;
  idu: boolean;
  mttes: boolean;
  regAdm: boolean;
  ips: boolean;
  libros: boolean;
  contAdm: boolean;
  auditoria: Record<string, AuditoriaCelda>;
}

interface ClienteFila {
  id: string;
  nombre: string;
  asambleas: RegistroAsamblea[];
}

interface Props {
  periodo: string;
  clientes: ClienteFila[];
  nombresPorId: Record<string, string>;
}

const COLUMNAS: { campo: string; label: string }[] = [
  { campo: "asambleaSolicitada", label: "Asamblea Solic." },
  { campo: "asambleaConfirmada", label: "Confirmada" },
  { campo: "idu", label: "IDU" },
  { campo: "mttes", label: "MTTES" },
  { campo: "regAdm", label: "Reg. Adm" },
  { campo: "ips", label: "IPS" },
  { campo: "libros", label: "Libros" },
  { campo: "contAdm", label: "Cont. Adm" },
];

export function AsambleasTabla({ periodo, clientes, nombresPorId }: Props) {
  const router = useRouter();
  const toast = useToast();
  // Estado optimista local: clave "clienteId:campo" → boolean
  const [pendientes, setPendientes] = useState<Record<string, boolean>>({});

  function valorDe(c: ClienteFila, campo: string): boolean {
    const clave = `${c.id}:${campo}`;
    if (clave in pendientes) return pendientes[clave];
    const reg = c.asambleas[0];
    return reg ? Boolean(reg[campo as keyof RegistroAsamblea]) : false;
  }

  function auditoriaDe(c: ClienteFila, campo: string): AuditoriaCelda | null {
    return c.asambleas[0]?.auditoria?.[campo] ?? null;
  }

  function tooltipDe(c: ClienteFila, campo: string, label: string): string {
    const marcado = valorDe(c, campo);
    const audit = auditoriaDe(c, campo);
    if (marcado && audit) {
      const nombre = nombresPorId[audit.userId] ?? "usuario eliminado";
      return `${label}: tildado por ${nombre} el ${formatFechaHora(audit.at)}`;
    }
    return `${label} — clic para tildar`;
  }

  async function toggle(c: ClienteFila, campo: string) {
    const nuevo = !valorDe(c, campo);
    const clave = `${c.id}:${campo}`;
    setPendientes((prev) => ({ ...prev, [clave]: nuevo }));

    const res = await fetch("/api/asambleas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId: c.id, periodo, campo, valor: nuevo }),
    });

    if (!res.ok) {
      setPendientes((prev) => ({ ...prev, [clave]: !nuevo }));
      toast("error", "No se pudo guardar");
      return;
    }
    router.refresh();
  }

  async function setFechaEEFF(c: ClienteFila, fecha: string) {
    const res = await fetch("/api/asambleas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: c.id,
        periodo,
        campo: "fechaEEFF",
        fechaEEFF: fecha ? `${fecha}T12:00:00Z` : null,
      }),
    });
    if (!res.ok) {
      toast("error", "No se pudo guardar la fecha");
      return;
    }
    router.refresh();
  }

  function fechaEEFFde(c: ClienteFila): string {
    const f = c.asambleas[0]?.fechaEEFF;
    if (!f) return "";
    return new Date(f).toISOString().slice(0, 10);
  }

  function iniciales(nombre: string): string {
    return nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface/60">
            <th className="text-left py-3 px-4 font-medium text-ink-muted text-xs uppercase tracking-wide sticky left-0 bg-surface/60 min-w-44">
              Cliente
            </th>
            <th className="py-3 px-2 font-medium text-ink-muted text-xs uppercase tracking-wide whitespace-nowrap">
              Fecha EEFF
            </th>
            {COLUMNAS.map((col) => (
              <th
                key={col.campo}
                className="py-3 px-2 font-medium text-ink-muted text-xs uppercase tracking-wide text-center whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id} className="border-b border-line/60 last:border-0">
              <td className="py-2 px-4 sticky left-0 bg-white">
                <Link href={`/clientes/${c.id}`} className="font-medium text-primary hover:underline">
                  {c.nombre}
                </Link>
              </td>
              <td className="py-2 px-2 text-center">
                <input
                  type="date"
                  defaultValue={fechaEEFFde(c)}
                  onBlur={(e) => {
                    if (e.target.value !== fechaEEFFde(c)) setFechaEEFF(c, e.target.value);
                  }}
                  className="h-8 rounded-control border border-line px-2 text-xs text-ink-muted focus:outline-none focus:border-primary"
                />
              </td>
              {COLUMNAS.map((col) => {
                const marcado = valorDe(c, col.campo);
                const audit = auditoriaDe(c, col.campo);
                const nombreQuien = audit ? nombresPorId[audit.userId] : null;
                return (
                  <td key={col.campo} className="py-2 px-2 text-center">
                    <div className="inline-flex flex-col items-center gap-0.5">
                      <button
                        onClick={() => toggle(c, col.campo)}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-sm font-semibold transition-colors ${
                          marcado
                            ? "border-transparent bg-[#DCFCE7] text-[#15803D]"
                            : "border-line text-transparent hover:border-gold hover:text-ink-faint"
                        }`}
                        title={tooltipDe(c, col.campo, col.label)}
                      >
                        ✓
                      </button>
                      {marcado && nombreQuien && (
                        <span
                          className="text-[9px] text-ink-faint leading-none"
                          title={tooltipDe(c, col.campo, col.label)}
                        >
                          {iniciales(nombreQuien)}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 py-3 border-t border-line text-xs text-ink-faint">
        Pasá el mouse sobre un tilde (o mirá las iniciales debajo) para ver quién lo marcó y cuándo.
      </p>
    </div>
  );
}
