"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface Ciudad {
  id: string;
  nombre: string;
}

interface Departamento {
  id: string;
  nombre: string;
  ciudades: Ciudad[];
}

export function CatalogoGeografico({ departamentos }: { departamentos: Departamento[] }) {
  const router = useRouter();
  const toast = useToast();
  const [modalDepto, setModalDepto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevaCiudad, setNuevaCiudad] = useState<Record<string, string>>({});
  const [agregandoCiudad, setAgregandoCiudad] = useState<string | null>(null);

  async function crearDepartamento(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/departamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: form.get("nombre") }),
    });
    const json = await res.json().catch(() => null);
    setGuardando(false);
    if (!res.ok) {
      setError(json?.error ?? "No se pudo crear");
      return;
    }
    toast("exito", "Departamento creado");
    setModalDepto(false);
    router.refresh();
  }

  async function agregarCiudad(departamentoId: string) {
    const nombre = (nuevaCiudad[departamentoId] ?? "").trim();
    if (!nombre) return;
    setAgregandoCiudad(departamentoId);
    const res = await fetch("/api/ciudades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departamentoId, nombre }),
    });
    const json = await res.json().catch(() => null);
    setAgregandoCiudad(null);
    if (!res.ok) {
      toast("error", json?.error ?? "No se pudo agregar la ciudad");
      return;
    }
    setNuevaCiudad((prev) => ({ ...prev, [departamentoId]: "" }));
    toast("exito", "Ciudad agregada");
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setModalDepto(true)}>+ Nuevo departamento</Button>
      </div>

      {departamentos.length === 0 ? (
        <EmptyState titulo="Sin departamentos cargados" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departamentos.map((d) => (
            <div key={d.id} className="bg-white rounded-card border border-line p-5">
              <p className="font-heading font-semibold text-primary mb-3">{d.nombre}</p>

              {d.ciudades.length === 0 ? (
                <p className="text-xs text-ink-faint mb-3">Sin ciudades cargadas.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {d.ciudades.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-base"
                    >
                      {c.nombre}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={nuevaCiudad[d.id] ?? ""}
                  onChange={(e) => setNuevaCiudad((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && agregarCiudad(d.id)}
                  placeholder="Nueva ciudad..."
                  className="flex-1 h-9 rounded-control border border-line px-3 text-sm focus:outline-none focus:border-primary"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => agregarCiudad(d.id)}
                  disabled={agregandoCiudad === d.id || !nuevaCiudad[d.id]?.trim()}
                >
                  {agregandoCiudad === d.id ? <Spinner /> : "Agregar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalDepto} onClose={() => setModalDepto(false)} title="Nuevo departamento">
        <form onSubmit={crearDepartamento} className="space-y-4">
          <Input label="Nombre" name="nombre" required placeholder="Ej: Guairá" />
          {error && (
            <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalDepto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner className="text-white" /> : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
