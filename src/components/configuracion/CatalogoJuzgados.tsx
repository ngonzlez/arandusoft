"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Table, THead, TH, TRow, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface Secretaria {
  id: string;
  nombre: string;
  actuario: string | null;
  telefono: string | null;
  activo: boolean;
}

interface Juzgado {
  id: string;
  nombre: string;
  circunscripcion: string | null;
  fuero: string | null;
  juezActual: string | null;
  ubicacion: string | null;
  telefono: string | null;
  activo: boolean;
  secretarias: Secretaria[];
}

const ESTADO_BADGE = {
  activo: { bg: "#DCFCE7", text: "#15803D" },
  inactivo: { bg: "#F1F5F9", text: "#64748B" },
};

export function CatalogoJuzgados({ juzgados }: { juzgados: Juzgado[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [editar, setEditar] = useState<Juzgado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevaSecNombre, setNuevaSecNombre] = useState("");
  const [editandoSecId, setEditandoSecId] = useState<string | null>(null);
  const [eliminandoSecId, setEliminandoSecId] = useState<string | null>(null);

  // Tras refrescar (agregar/desactivar secretaría), el modal abierto debe
  // reflejar los datos frescos del prop, no la foto vieja del clic inicial.
  useEffect(() => {
    if (!editar) return;
    const actualizado = juzgados.find((j) => j.id === editar.id);
    if (actualizado) setEditar(actualizado);
  }, [juzgados]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return juzgados;
    return juzgados.filter(
      (j) =>
        j.nombre.toLowerCase().includes(q) ||
        (j.circunscripcion ?? "").toLowerCase().includes(q)
    );
  }, [juzgados, busqueda]);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/juzgados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.get("nombre"),
        circunscripcion: form.get("circunscripcion"),
        fuero: form.get("fuero"),
        juezActual: form.get("juezActual"),
        ubicacion: form.get("ubicacion"),
        telefono: form.get("telefono"),
      }),
    });
    const json = await res.json().catch(() => null);
    setGuardando(false);
    if (!res.ok) {
      setError(json?.error ?? "No se pudo crear");
      return;
    }
    toast("exito", "Juzgado creado");
    setModalNuevo(false);
    router.refresh();
  }

  async function actualizar(id: string, cambios: Record<string, unknown>) {
    setGuardando(true);
    const res = await fetch(`/api/juzgados/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    const json = await res.json().catch(() => null);
    setGuardando(false);
    if (!res.ok) {
      toast("error", json?.error ?? "No se pudo actualizar");
      return false;
    }
    toast("exito", "Juzgado actualizado");
    router.refresh();
    return true;
  }

  async function agregarSecretaria(juzgadoId: string) {
    const nombre = nuevaSecNombre.trim();
    if (!nombre) return;
    setGuardando(true);
    const res = await fetch(`/api/juzgados/${juzgadoId}/secretarias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const json = await res.json().catch(() => null);
    setGuardando(false);
    if (!res.ok) {
      toast("error", json?.error ?? "No se pudo agregar la secretaría");
      return;
    }
    setNuevaSecNombre("");
    toast("exito", "Secretaría agregada");
    router.refresh();
  }

  async function actualizarSecretaria(juzgadoId: string, secId: string, cambios: Record<string, unknown>) {
    const res = await fetch(`/api/juzgados/${juzgadoId}/secretarias/${secId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    if (!res.ok) {
      toast("error", "No se pudo actualizar la secretaría");
      return false;
    }
    router.refresh();
    return true;
  }

  async function eliminarSecretaria(juzgadoId: string, secId: string) {
    const res = await fetch(`/api/juzgados/${juzgadoId}/secretarias/${secId}`, { method: "DELETE" });
    if (!res.ok) {
      toast("error", "No se pudo eliminar la secretaría");
      return;
    }
    setEliminandoSecId(null);
    toast("exito", "Secretaría eliminada");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o circunscripción..."
          className="h-9 w-72 max-w-full rounded-control border border-line px-3 text-sm focus:outline-none focus:border-primary"
        />
        <Button onClick={() => setModalNuevo(true)}>+ Nuevo juzgado</Button>
      </div>

      <p className="text-xs text-ink-faint mb-3">
        {visibles.length} de {juzgados.length} juzgados. Cargados desde la guía del estudio — es un parseo
        estructural de esa fuente, no una verificación judicial: revisá los datos si algo no coincide.
      </p>

      {visibles.length === 0 ? (
        <EmptyState titulo="Sin resultados" />
      ) : (
        <Table>
          <THead>
            <TH>Juzgado</TH>
            <TH>Circunscripción</TH>
            <TH>Secretarías</TH>
            <TH>Estado</TH>
            <TH className="text-right">Acciones</TH>
          </THead>
          <tbody>
            {visibles.map((j) => (
              <TRow key={j.id} className={!j.activo ? "opacity-50" : ""}>
                <TD className="font-medium text-primary">{j.nombre}</TD>
                <TD>{j.circunscripcion ?? "—"}</TD>
                <TD>{j.secretarias.length || "—"}</TD>
                <TD>
                  <Badge style={j.activo ? ESTADO_BADGE.activo : ESTADO_BADGE.inactivo}>
                    {j.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditar(j)}>
                    Editar
                  </Button>
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      )}

      {/* Nuevo juzgado */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo juzgado">
        <form onSubmit={crear} className="space-y-4">
          <Input label="Nombre" name="nombre" required placeholder="Ej: Juzgado Civil y Comercial 1er Turno" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Circunscripción (opcional)" name="circunscripcion" placeholder="Ej: Capital" />
            <Input label="Fuero (opcional)" name="fuero" placeholder="Ej: Civil" />
            <Input label="Juez/a actual (opcional)" name="juezActual" />
            <Input label="Teléfono (opcional)" name="telefono" />
          </div>
          <Textarea label="Ubicación (opcional)" name="ubicacion" rows={2} />
          {error && <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalNuevo(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner className="text-white" /> : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Editar juzgado + secretarías */}
      <Modal open={!!editar} onClose={() => setEditar(null)} title={editar?.nombre ?? "Editar juzgado"}>
        {editar && (
          <div className="space-y-5">
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const ok = await actualizar(editar.id, {
                  nombre: form.get("nombre"),
                  circunscripcion: form.get("circunscripcion"),
                  fuero: form.get("fuero"),
                  juezActual: form.get("juezActual"),
                  ubicacion: form.get("ubicacion"),
                  telefono: form.get("telefono"),
                });
                if (ok) setEditar(null);
              }}
            >
              <Input label="Nombre" name="nombre" defaultValue={editar.nombre} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Circunscripción" name="circunscripcion" defaultValue={editar.circunscripcion ?? ""} />
                <Input label="Fuero" name="fuero" defaultValue={editar.fuero ?? ""} />
                <Input label="Juez/a actual" name="juezActual" defaultValue={editar.juezActual ?? ""} />
                <Input label="Teléfono" name="telefono" defaultValue={editar.telefono ?? ""} />
              </div>
              <Textarea label="Ubicación" name="ubicacion" defaultValue={editar.ubicacion ?? ""} rows={2} />

              <label className="flex items-center gap-2 text-sm text-ink-base">
                <input
                  type="checkbox"
                  defaultChecked={editar.activo}
                  onChange={(e) => actualizar(editar.id, { activo: e.target.checked })}
                />
                Juzgado activo
              </label>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditar(null)}>
                  Cerrar
                </Button>
                <Button type="submit" disabled={guardando}>
                  {guardando ? <Spinner className="text-white" /> : "Guardar"}
                </Button>
              </div>
            </form>

            <div className="pt-4 border-t border-line">
              <p className="text-sm font-semibold text-primary mb-2.5">
                Secretarías {editar.secretarias.length > 0 && `(${editar.secretarias.length})`}
              </p>
              <div className="space-y-2 mb-3">
                {editar.secretarias.map((s) => {
                  if (eliminandoSecId === s.id) {
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-control border border-urgent/40 bg-[#FEE2E2]/40 px-3 py-2"
                      >
                        <span className="flex-1 text-sm text-urgent">
                          ¿Eliminar <strong>{s.nombre}</strong> definitivamente?
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => setEliminandoSecId(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => eliminarSecretaria(editar.id, s.id)}>
                          Eliminar
                        </Button>
                      </div>
                    );
                  }

                  if (editandoSecId === s.id) {
                    return (
                      <form
                        key={s.id}
                        className="rounded-control border border-primary/40 px-3 py-2 space-y-2"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = new FormData(e.currentTarget);
                          const ok = await actualizarSecretaria(editar.id, s.id, {
                            nombre: form.get("nombre"),
                            actuario: form.get("actuario"),
                            telefono: form.get("telefono"),
                          });
                          if (ok) setEditandoSecId(null);
                        }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            name="nombre"
                            defaultValue={s.nombre}
                            placeholder="Nombre"
                            className="h-8 rounded-control border border-line px-2 text-sm focus:outline-none focus:border-primary"
                          />
                          <input
                            name="actuario"
                            defaultValue={s.actuario ?? ""}
                            placeholder="Actuario/a"
                            className="h-8 rounded-control border border-line px-2 text-sm focus:outline-none focus:border-primary"
                          />
                          <input
                            name="telefono"
                            defaultValue={s.telefono ?? ""}
                            placeholder="Teléfono"
                            className="h-8 rounded-control border border-line px-2 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditandoSecId(null)}>
                            Cancelar
                          </Button>
                          <Button type="submit" size="sm">
                            Guardar
                          </Button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2 rounded-control border border-line px-3 py-2 ${!s.activo ? "opacity-50" : ""}`}
                    >
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{s.nombre}</span>
                        {s.actuario && <span className="text-ink-muted"> · {s.actuario}</span>}
                        {s.telefono && <span className="text-ink-faint"> · {s.telefono}</span>}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <input
                          type="checkbox"
                          defaultChecked={s.activo}
                          onChange={(e) => actualizarSecretaria(editar.id, s.id, { activo: e.target.checked })}
                        />
                        Activa
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => setEditandoSecId(s.id)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEliminandoSecId(s.id)}>
                        Eliminar
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  value={nuevaSecNombre}
                  onChange={(e) => setNuevaSecNombre(e.target.value)}
                  placeholder="Ej: Secretaría 3"
                  className="flex-1 h-9 rounded-control border border-line px-3 text-sm focus:outline-none focus:border-primary"
                />
                <Button size="sm" variant="outline" onClick={() => agregarSecretaria(editar.id)} disabled={!nuevaSecNombre.trim()}>
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
