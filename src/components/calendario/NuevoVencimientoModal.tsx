"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TipoVencimiento } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  clientes: { id: string; nombre: string }[];
  fechaInicial?: string; // yyyy-mm-dd, precargada al hacer clic en un día del calendario
}

export function NuevoVencimientoModal({ open, onClose, clientes, fechaInicial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/vencimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: form.get("clienteId") || null,
        tipo: form.get("tipo"),
        fechaVencimiento: `${form.get("fecha")}T12:00:00Z`,
      }),
    });

    const json = await res.json().catch(() => null);
    setGuardando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo crear");
      return;
    }

    toast("exito", "Vencimiento creado");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo vencimiento">
      {/* key fuerza remount para que defaultValue tome la nueva fecha al reabrir */}
      <form onSubmit={crear} className="space-y-4" key={fechaInicial ?? "sin-fecha"}>
        <Select label="Cliente (opcional)" name="clienteId" defaultValue="">
          <option value="">Sin cliente (general)</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
        <Select label="Tipo" name="tipo" defaultValue="IPS" required>
          {Object.values(TipoVencimiento)
            .filter((t) => t !== "PLAZO_PROCESAL") // Fase 2 jurídico
            .map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
        </Select>
        <Input label="Fecha de vencimiento" name="fecha" type="date" defaultValue={fechaInicial} required />

        {error && (
          <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? <Spinner className="text-white" /> : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
