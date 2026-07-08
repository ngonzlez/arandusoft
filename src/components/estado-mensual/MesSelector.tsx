"use client";

import { usePathname, useRouter } from "next/navigation";
import { formatPeriodo } from "@/lib/format";

function sumarMes(mes: string, delta: number): string {
  const [año, m] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(año, m - 1 + delta, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MesSelector({ mes }: { mes: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const ir = (nuevoMes: string) => router.push(`${pathname}?mes=${nuevoMes}`);

  return (
    <div className="flex items-center gap-1 bg-white border border-line rounded-control">
      <button
        onClick={() => ir(sumarMes(mes, -1))}
        className="px-3 py-2 text-ink-muted hover:text-primary transition-colors"
        aria-label="Mes anterior"
      >
        ‹
      </button>
      <span className="px-2 text-sm font-medium text-primary min-w-32 text-center">
        {formatPeriodo(mes)}
      </span>
      <button
        onClick={() => ir(sumarMes(mes, 1))}
        className="px-3 py-2 text-ink-muted hover:text-primary transition-colors"
        aria-label="Mes siguiente"
      >
        ›
      </button>
    </div>
  );
}
