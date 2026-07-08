"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EstadoExpediente } from "@prisma/client";
import { ESTADO_EXPEDIENTE_LABELS } from "@/lib/expedientes";
import { Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export function EstadoExpedienteControl({
  expedienteId,
  estadoActual,
}: {
  expedienteId: string;
  estadoActual: EstadoExpediente;
}) {
  const router = useRouter();
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);

  async function cambiar(estado: string) {
    setGuardando(true);
    const res = await fetch(`/api/expedientes/${expedienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    setGuardando(false);

    if (!res.ok) {
      toast("error", "No se pudo cambiar el estado");
      return;
    }
    router.refresh();
  }

  return (
    <Select
      value={estadoActual}
      onChange={(e) => cambiar(e.target.value)}
      disabled={guardando}
      className="w-auto h-9 text-sm"
    >
      {Object.entries(ESTADO_EXPEDIENTE_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}
