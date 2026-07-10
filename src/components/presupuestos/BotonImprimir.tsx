"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function BotonImprimir() {
  return (
    <div className="no-print max-w-[210mm] mx-auto flex justify-between items-center py-4 px-4">
      <Link href="/presupuestos">
        <Button variant="ghost">← Volver</Button>
      </Link>
      <Button onClick={() => window.print()}>Imprimir / Guardar PDF</Button>
    </div>
  );
}
