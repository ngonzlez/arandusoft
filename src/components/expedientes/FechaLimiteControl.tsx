"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function FechaLimiteControl({
  expedienteId,
  fechaLimite,
}: {
  expedienteId: string;
  fechaLimite: string | null;
}) {
  const router = useRouter();
  const toast = useToast();

  async function cambiar(fecha: string) {
    const res = await fetch(`/api/expedientes/${expedienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaLimite: fecha ? `${fecha}T12:00:00Z` : null }),
    });
    if (!res.ok) {
      toast("error", "No se pudo cambiar la fecha límite");
      return;
    }
    router.refresh();
  }

  return (
    <input
      type="date"
      defaultValue={fechaLimite ? fechaLimite.slice(0, 10) : ""}
      onChange={(e) => cambiar(e.target.value)}
      className="h-8 rounded-control border border-line px-2 text-sm text-ink-base focus:outline-none focus:border-primary"
    />
  );
}
