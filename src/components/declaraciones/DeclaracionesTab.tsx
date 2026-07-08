"use client";

import { useCallback, useEffect, useState } from "react";
import { TipoObligacion } from "@prisma/client";
import { OBLIGACIONES_LABELS } from "@/lib/clientes";
import { formatFecha } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner, PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { EnviarArchivoModal } from "@/components/shared/EnviarArchivoModal";

interface Declaracion {
  id: string;
  tipo: TipoObligacion;
  periodo: string;
  fechaPresentacion: string;
  archivoNombreOriginal: string | null;
  archivoFormato: "pdf" | "xlsx";
  cargador: { nombre: string };
}

const ICONO_FORMATO: Record<string, string> = { pdf: "📄", xlsx: "📊" };

interface Props {
  clienteId: string;
  clienteNombre: string;
  puedeSubir: boolean; // ADMIN/CONTABLE
}

export function DeclaracionesTab({ clienteId, clienteNombre, puedeSubir }: Props) {
  const toast = useToast();
  const [cargando, setCargando] = useState(true);
  const [recientes, setRecientes] = useState<Declaracion[]>([]);
  const [historial, setHistorial] = useState<Declaracion[]>([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [modalSubir, setModalSubir] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [enviar, setEnviar] = useState<Declaracion | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/clientes/${clienteId}/declaraciones`);
    const json = await res.json().catch(() => null);
    setRecientes(json?.data?.recientes ?? []);
    setHistorial(json?.data?.historial ?? []);
    setCargando(false);
  }, [clienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function onSubir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorSubida(null);
    setSubiendo(true);

    const form = new FormData(e.currentTarget);
    form.set("clienteId", clienteId);

    const res = await fetch("/api/declaraciones", { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    setSubiendo(false);

    if (!res.ok) {
      setErrorSubida(json?.error ?? "No se pudo subir la declaración");
      return;
    }

    toast("exito", "Declaración subida");
    setModalSubir(false);
    cargar();
  }

  function Fila({ d }: { d: Declaracion }) {
    return (
      <tr className="border-b border-line/60 last:border-0">
        <td className="py-2.5 px-4 font-medium text-primary">
          <span className="mr-1.5" title={d.archivoFormato === "xlsx" ? "Excel" : "PDF"}>
            {ICONO_FORMATO[d.archivoFormato] ?? "📄"}
          </span>
          {OBLIGACIONES_LABELS[d.tipo]}
        </td>
        <td className="py-2.5 px-4 text-ink-muted">{d.periodo}</td>
        <td className="py-2.5 px-4 text-ink-muted">{formatFecha(d.fechaPresentacion)}</td>
        <td className="py-2.5 px-4 text-ink-muted">{d.cargador.nombre}</td>
        <td className="py-2.5 px-4">
          <div className="flex justify-end gap-2">
            <a href={`/api/declaraciones/${d.id}/descargar`} target="_blank" rel="noopener">
              <Button variant="outline" size="sm">Descargar</Button>
            </a>
            <Button variant="ghost" size="sm" onClick={() => setEnviar(d)}>
              ✉ Enviar
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  function Tabla({ datos }: { datos: Declaracion[] }) {
    return (
      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60">
              {["Tipo", "Período", "Fecha", "Cargado por", ""].map((h, i) => (
                <th
                  key={i}
                  className={`py-3 px-4 font-medium text-ink-muted text-xs uppercase tracking-wide ${
                    i === 4 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map((d) => (
              <Fila key={d.id} d={d} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (cargando) return <PageSpinner />;

  return (
    <div className="space-y-5">
      {puedeSubir && (
        <div className="flex justify-end">
          <Button onClick={() => setModalSubir(true)}>+ Subir declaración</Button>
        </div>
      )}

      {recientes.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Sin declaraciones recientes"
            descripcion="Las declaraciones subidas en los últimos 6 meses aparecen acá."
          />
        </Card>
      ) : (
        <Tabla datos={recientes} />
      )}

      {historial.length > 0 && (
        <div>
          <button
            onClick={() => setMostrarHistorial((v) => !v)}
            className="text-sm font-medium text-accent hover:underline"
          >
            {mostrarHistorial ? "▾" : "▸"} Historial (más de 6 meses) — {historial.length}
          </button>
          {mostrarHistorial && (
            <div className="mt-3">
              <Tabla datos={historial} />
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalSubir}
        onClose={() => setModalSubir(false)}
        title={`Subir declaración — ${clienteNombre}`}
      >
        <form onSubmit={onSubir} className="space-y-4">
          <Select label="Tipo" name="tipo" required defaultValue="IVA">
            {Object.entries(OBLIGACIONES_LABELS).map(([tipo, label]) => (
              <option key={tipo} value={tipo}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label="Período"
            name="periodo"
            placeholder="2026-07"
            pattern="\d{4}-(0[1-9]|1[0-2])"
            helper="Formato AAAA-MM (ej: 2026-07)"
            required
          />
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1.5">
              Archivo (PDF o Excel)
            </label>
            <input
              type="file"
              name="archivo"
              accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-control file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-light"
            />
            <p className="text-xs text-ink-faint mt-1">
              Subí el PDF de la declaración o el Excel que el cliente presenta en
              Marangatu — ambos quedan archivados acá.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" name="vincularEstadoMensual" value="true" defaultChecked className="accent-[#C9A84C]" />
            Marcar la obligación del período como presentada
          </label>

          {errorSubida && (
            <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">
              {errorSubida}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalSubir(false)} disabled={subiendo}>
              Cancelar
            </Button>
            <Button type="submit" disabled={subiendo}>
              {subiendo ? <Spinner className="text-white" /> : "Subir"}
            </Button>
          </div>
        </form>
      </Modal>

      {enviar && (
        <EnviarArchivoModal
          open={!!enviar}
          onClose={() => setEnviar(null)}
          tipo="declaracion"
          archivoId={enviar.id}
          descripcionArchivo={`${OBLIGACIONES_LABELS[enviar.tipo]} · ${enviar.periodo} · ${clienteNombre}`}
        />
      )}
    </div>
  );
}
