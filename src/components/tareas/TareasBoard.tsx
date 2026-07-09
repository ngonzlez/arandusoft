"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EstadoTarea, Prioridad } from "@prisma/client";
import { formatFecha } from "@/lib/format";
import { PRIORIDAD, ESTADO_TAREA } from "@/lib/badges";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SlideOver } from "@/components/ui/SlideOver";
import { NotasPanel } from "@/components/shared/NotasPanel";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface ChecklistItem {
  id: string;
  texto: string;
  hecho: boolean;
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTarea;
  prioridad: Prioridad;
  fechaLimite: string | null;
  checklist: ChecklistItem[];
  cliente: { id: string; nombre: string } | null;
  responsable: { id: string; nombre: string };
}

interface Props {
  tareas: Tarea[];
  usuarios: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string }[];
  expedientes: { id: string; titulo: string }[];
  miUserId: string;
}

const COLUMNAS: { estado: EstadoTarea; label: string }[] = [
  { estado: "PENDIENTE", label: "Pendiente" },
  { estado: "EN_PROGRESO", label: "En progreso" },
  { estado: "COMPLETADA", label: "Completada" },
];

const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

export function TareasBoard({ tareas, usuarios, clientes, expedientes, miUserId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [vista, setVista] = useState<"kanban" | "lista">("kanban");
  const [soloMias, setSoloMias] = useState(false);
  const [modalNueva, setModalNueva] = useState(false);
  const [detalle, setDetalle] = useState<Tarea | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checklistNueva, setChecklistNueva] = useState<string[]>([""]);

  const visibles = soloMias ? tareas.filter((t) => t.responsable.id === miUserId) : tareas;

  async function moverEstado(tarea: Tarea, estado: EstadoTarea) {
    const res = await fetch(`/api/tareas/${tarea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) {
      toast("error", "No se pudo mover la tarea");
      return;
    }
    router.refresh();
  }

  async function toggleChecklistItem(tarea: Tarea, itemId: string) {
    const checklist = tarea.checklist.map((i) =>
      i.id === itemId ? { ...i, hecho: !i.hecho } : i
    );
    const res = await fetch(`/api/tareas/${tarea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist }),
    });
    if (!res.ok) {
      toast("error", "No se pudo actualizar el checklist");
      return;
    }
    setDetalle({ ...tarea, checklist });
    router.refresh();
  }

  async function cambiarFechaLimite(tarea: Tarea, fecha: string) {
    const fechaLimite = fecha ? `${fecha}T12:00:00Z` : null;
    const res = await fetch(`/api/tareas/${tarea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaLimite }),
    });
    if (!res.ok) {
      toast("error", "No se pudo cambiar la fecha límite");
      return;
    }
    setDetalle({ ...tarea, fechaLimite });
    router.refresh();
  }

  async function crearTarea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.get("titulo"),
        descripcion: form.get("descripcion"),
        clienteId: form.get("clienteId") || null,
        expedienteId: form.get("expedienteId") || null,
        responsableId: form.get("responsableId"),
        prioridad: form.get("prioridad"),
        fechaLimite: form.get("fechaLimite") ? `${form.get("fechaLimite")}T12:00:00Z` : null,
        checklist: checklistNueva.filter(Boolean).map((texto) => ({ texto })),
      }),
    });

    const json = await res.json().catch(() => null);
    setGuardando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo crear la tarea");
      return;
    }

    toast("exito", "Tarea creada");
    setModalNueva(false);
    setChecklistNueva([""]);
    router.refresh();
  }

  function progresoDe(t: Tarea): string | null {
    if (!t.checklist?.length) return null;
    const hechas = t.checklist.filter((i) => i.hecho).length;
    return `${hechas}/${t.checklist.length}`;
  }

  function TarjetaTarea({ t }: { t: Tarea }) {
    const progreso = progresoDe(t);
    return (
      <button
        onClick={() => setDetalle(t)}
        className="w-full text-left bg-white rounded-control border border-line p-3 hover:border-gold/60 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-primary leading-snug">{t.titulo}</p>
          <Badge style={PRIORIDAD[t.prioridad]}>{PRIORIDAD_LABEL[t.prioridad]}</Badge>
        </div>
        {t.cliente && <p className="text-xs text-ink-muted mt-1">{t.cliente.nombre}</p>}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            {t.fechaLimite && <span>{formatFecha(t.fechaLimite, "dd/MM")}</span>}
            {progreso && <span>☑ {progreso}</span>}
          </div>
          <Avatar nombre={t.responsable.nombre} size="sm" />
        </div>
      </button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1">
          {(
            [
              ["kanban", "Kanban"],
              ["lista", "Lista"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setVista(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                vista === key
                  ? "bg-primary text-white"
                  : "bg-white border border-line text-ink-muted hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setSoloMias((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              soloMias
                ? "bg-gold text-white"
                : "bg-white border border-line text-ink-muted hover:border-gold/60"
            }`}
          >
            Solo mías
          </button>
        </div>
        <Button size="sm" onClick={() => setModalNueva(true)}>
          + Nueva tarea
        </Button>
      </div>

      {vista === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNAS.map((col) => {
            const deCol = visibles.filter((t) => t.estado === col.estado);
            return (
              <div key={col.estado} className="bg-surface/70 rounded-card border border-line p-3">
                <div className="flex items-center justify-between px-1 mb-3">
                  <h3 className="font-heading text-sm font-semibold text-primary">{col.label}</h3>
                  <span className="text-xs text-ink-faint">{deCol.length}</span>
                </div>
                <div className="space-y-2">
                  {deCol.map((t) => (
                    <TarjetaTarea key={t.id} t={t} />
                  ))}
                  {deCol.length === 0 && (
                    <p className="text-xs text-ink-faint text-center py-6">Sin tareas</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : visibles.length === 0 ? (
        <Card>
          <EmptyState titulo="Sin tareas" />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface/60">
                {["Tarea", "Cliente", "Prioridad", "Estado", "Vence", "Responsable"].map((h) => (
                  <th key={h} className="py-3 px-4 text-left font-medium text-ink-muted text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setDetalle(t)}
                  className="border-b border-line/60 last:border-0 cursor-pointer hover:bg-surface/50 transition-colors"
                >
                  <td className="py-2.5 px-4 font-medium text-primary">{t.titulo}</td>
                  <td className="py-2.5 px-4 text-ink-muted">{t.cliente?.nombre ?? "—"}</td>
                  <td className="py-2.5 px-4">
                    <Badge style={PRIORIDAD[t.prioridad]}>{PRIORIDAD_LABEL[t.prioridad]}</Badge>
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge style={ESTADO_TAREA[t.estado]}>
                      {COLUMNAS.find((c) => c.estado === t.estado)?.label}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-ink-muted">
                    {t.fechaLimite ? formatFecha(t.fechaLimite) : "—"}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="flex items-center gap-2">
                      <Avatar nombre={t.responsable.nombre} size="sm" />
                      <span className="text-ink-muted">{t.responsable.nombre}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detalle de tarea — slide-over animado, no modal */}
      <SlideOver
        open={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle?.titulo ?? "Tarea"}
        width={440}
      >
        {detalle && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge style={PRIORIDAD[detalle.prioridad]}>
                {PRIORIDAD_LABEL[detalle.prioridad]}
              </Badge>
              <Badge style={ESTADO_TAREA[detalle.estado]}>
                {COLUMNAS.find((c) => c.estado === detalle.estado)?.label}
              </Badge>
              {detalle.fechaLimite && (
                <span className="text-xs text-ink-muted ml-auto">
                  Vence {formatFecha(detalle.fechaLimite)}
                </span>
              )}
            </div>

            {detalle.descripcion && (
              <p className="text-sm text-ink-muted leading-relaxed">{detalle.descripcion}</p>
            )}

            <div className="rounded-card border border-line bg-white p-4 space-y-3">
              {detalle.cliente && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-muted">Cliente</span>
                  <Link href={`/clientes/${detalle.cliente.id}`} className="text-accent hover:underline font-medium">
                    {detalle.cliente.nombre}
                  </Link>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Responsable</span>
                <span className="flex items-center gap-2 font-medium text-ink-base">
                  <Avatar nombre={detalle.responsable.nombre} size="sm" />
                  {detalle.responsable.nombre}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="text-ink-muted shrink-0">Fecha límite</span>
                <input
                  type="date"
                  value={detalle.fechaLimite ? detalle.fechaLimite.slice(0, 10) : ""}
                  onChange={(e) => cambiarFechaLimite(detalle, e.target.value)}
                  className="h-8 rounded-control border border-line px-2 text-sm text-ink-base focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {detalle.checklist?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-semibold text-primary">Subtareas</p>
                  <span className="text-xs text-ink-faint">
                    {detalle.checklist.filter((i) => i.hecho).length}/{detalle.checklist.length}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-line-soft overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-success transition-all"
                    style={{
                      width: `${(detalle.checklist.filter((i) => i.hecho).length / detalle.checklist.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="space-y-1 rounded-card border border-line bg-white divide-y divide-line-soft overflow-hidden">
                  {detalle.checklist.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2.5 text-sm cursor-pointer px-3.5 py-2.5 hover:bg-line-soft/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.hecho}
                        onChange={() => toggleChecklistItem(detalle, item.id)}
                        className="accent-[#C9A84C]"
                      />
                      <span className={item.hecho ? "line-through text-ink-faint" : "text-ink-base"}>
                        {item.texto}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <NotasPanel
              endpoint={`/api/tareas/${detalle.id}/notas`}
              placeholder="Ej: fui con el cliente a buscar tal documento, dijo que presenta el..."
            />

            <div className="pt-1 border-t border-line">
              <p className="text-sm font-semibold text-primary mb-2.5 mt-4">Mover a</p>
              <div className="flex gap-2">
                {COLUMNAS.filter((c) => c.estado !== detalle.estado).map((c) => (
                  <Button
                    key={c.estado}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      moverEstado(detalle, c.estado);
                      setDetalle(null);
                    }}
                  >
                    → {c.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Nueva tarea */}
      <Modal open={modalNueva} onClose={() => setModalNueva(false)} title="Nueva tarea">
        <form onSubmit={crearTarea} className="space-y-4">
          <Input label="Título" name="titulo" required />
          <Textarea label="Descripción (opcional)" name="descripcion" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Responsable" name="responsableId" defaultValue={miUserId} required>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Select>
            <Select label="Prioridad" name="prioridad" defaultValue="MEDIA">
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </Select>
            <Select label="Cliente (opcional)" name="clienteId" defaultValue="">
              <option value="">Sin cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <Input label="Fecha límite" name="fechaLimite" type="date" />
            {expedientes.length > 0 && (
              <Select label="Expediente (opcional)" name="expedienteId" defaultValue="">
                <option value="">Sin expediente</option>
                {expedientes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.titulo}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-ink-muted mb-2">Checklist (opcional)</p>
            <div className="space-y-2">
              {checklistNueva.map((texto, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={texto}
                    onChange={(e) =>
                      setChecklistNueva((prev) =>
                        prev.map((t, j) => (j === i ? e.target.value : t))
                      )
                    }
                    placeholder={`Paso ${i + 1}`}
                    className="flex-1 h-9 rounded-control border border-line px-3 text-sm focus:outline-none focus:border-primary"
                  />
                  {i === checklistNueva.length - 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setChecklistNueva((prev) => [...prev, ""])}
                    >
                      +
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setChecklistNueva((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalNueva(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner className="text-white" /> : "Crear tarea"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
