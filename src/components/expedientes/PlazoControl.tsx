"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { contarDiasHabiles, feriadosEnRango } from "@/lib/plazos";
import { formatFecha } from "@/lib/format";

const SUBTIPOS = ["Vencimiento", "Caducidad de Instancia", "Prescripción"];

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PlazoControl({ expedienteId }: { expedienteId: string }) {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [fechaBase, setFechaBase] = useState(hoyISO());
  const [dias, setDias] = useState(3);
  const [subtipo, setSubtipo] = useState(SUBTIPOS[0]);
  const [excluirEnero, setExcluirEnero] = useState(true);
  const [excluidos, setExcluidos] = useState<string[]>([]);

  // Abrir automáticamente si venís desde una cédula (?plazo=1).
  useEffect(() => {
    if (searchParams.get("plazo")) setOpen(true);
  }, [searchParams]);

  const base = useMemo(() => new Date(`${fechaBase}T12:00:00`), [fechaBase]);
  const resultado = useMemo(
    () => contarDiasHabiles(base, dias, { excluirEnero, feriadosExcluidos: excluidos }),
    [base, dias, excluirEnero, excluidos]
  );
  const feriados = useMemo(() => {
    const hasta = new Date(base);
    hasta.setDate(hasta.getDate() + dias * 2 + 40);
    return feriadosEnRango(base, hasta);
  }, [base, dias]);

  function toggleFeriado(f: string) {
    setExcluidos((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  async function guardar() {
    setGuardando(true);
    const res = await fetch(`/api/expedientes/${expedienteId}/plazos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subtipoPlazo: subtipo,
        fechaBase: `${fechaBase}T12:00:00Z`,
        diasHabiles: dias,
        excluirEnero,
        feriadosExcluidos: excluidos,
      }),
    });
    const json = await res.json().catch(() => null);
    setGuardando(false);
    if (!res.ok) {
      toast("error", json?.error ?? "No se pudo guardar el plazo");
      return;
    }
    toast("exito", `Plazo guardado: vence ${formatFecha(resultado)}`);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Registrar plazo
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Calculadora de plazos">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-3">
            <Select label="Tipo de plazo" value={subtipo} onChange={(e) => setSubtipo(e.target.value)}>
              {SUBTIPOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Input
              label="Fecha base / inicio"
              type="date"
              value={fechaBase}
              onChange={(e) => setFechaBase(e.target.value)}
            />
            <Input
              label="Días hábiles"
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(Math.max(1, Number(e.target.value) || 1))}
            />
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={excluirEnero}
                onChange={(e) => setExcluirEnero(e.target.checked)}
              />
              Excluir enero (feria judicial)
            </label>

            {feriados.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-ink-muted">
                  Feriados en el período (desmarcar para contarlos)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {feriados.map((f) => {
                    const activo = !excluidos.includes(f.fecha);
                    return (
                      <button
                        key={f.fecha}
                        type="button"
                        onClick={() => toggleFeriado(f.fecha)}
                        className={`rounded-full border px-2 py-1 text-xs ${
                          activo
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-line text-ink-faint line-through"
                        }`}
                        title={f.nombre}
                      >
                        {formatFecha(new Date(`${f.fecha}T12:00:00`))} · {f.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Resultado en vivo */}
          <div className="flex flex-col justify-between rounded-control border border-line bg-white/5 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-faint">Resultado calculado</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
                {formatFecha(resultado)}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {dias} días hábiles desde {formatFecha(base)}
                {excluirEnero ? " · sin enero" : ""}
              </p>
            </div>
            <Button onClick={guardar} disabled={guardando} className="mt-4 w-full">
              {guardando ? "Guardando…" : "Guardar plazo"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
