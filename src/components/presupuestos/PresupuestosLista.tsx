"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EstadoPresupuesto } from "@prisma/client";
import { ESTADO_PRESUPUESTO } from "@/lib/badges";
import { formatFecha, formatGuaranies } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TH, TRow, TD } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Presupuesto {
  id: string;
  estado: EstadoPresupuesto;
  numero: number | null;
  anio: number | null;
  destNombre: string;
  fechaEmision: string;
  total: number;
  esPlantilla: boolean;
  nombrePlantilla: string | null;
  items: { descripcion: string }[];
  creador: { nombre: string };
}

const ESTADO_LABEL: Record<EstadoPresupuesto, string> = {
  BORRADOR: "Borrador",
  EMITIDO: "Emitido",
  ANULADO: "Anulado",
};

function numeroDe(p: Presupuesto): string {
  if (p.numero == null || p.anio == null) return "—";
  return `${String(p.numero).padStart(3, "0")}/${String(p.anio).slice(-2)}`;
}

export function PresupuestosLista({
  presupuestos,
  plantillas,
}: {
  presupuestos: Presupuesto[];
  plantillas: Presupuesto[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState("presupuestos");
  const [busqueda, setBusqueda] = useState("");
  const [emitir, setEmitir] = useState<Presupuesto | null>(null);
  const [guardarPlantilla, setGuardarPlantilla] = useState<Presupuesto | null>(null);
  const [anular, setAnular] = useState<Presupuesto | null>(null);
  const [cargando, setCargando] = useState(false);

  const visibles = presupuestos.filter(
    (p) =>
      !busqueda ||
      p.destNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      numeroDe(p).includes(busqueda)
  );

  async function accion(url: string, body?: unknown): Promise<Record<string, unknown> | null> {
    setCargando(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json().catch(() => null);
    setCargando(false);
    if (!res.ok) {
      toast("error", json?.error ?? "Error");
      return null;
    }
    return json;
  }

  async function confirmarEmitir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!emitir) return;
    const form = new FormData(e.currentTarget);
    const numero = form.get("numero")?.toString().trim();
    const ok = await accion(`/api/presupuestos/${emitir.id}/emitir`, numero ? { numero: Number(numero) } : {});
    if (ok) {
      toast("exito", "Presupuesto emitido");
      setEmitir(null);
      router.refresh();
    }
  }

  async function confirmarPlantilla(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!guardarPlantilla) return;
    const form = new FormData(e.currentTarget);
    const ok = await accion(`/api/presupuestos/${guardarPlantilla.id}/duplicar`, {
      comoPlantilla: true,
      nombrePlantilla: form.get("nombre"),
    });
    if (ok) {
      toast("exito", "Plantilla guardada");
      setGuardarPlantilla(null);
      router.refresh();
    }
  }

  async function confirmarAnular() {
    if (!anular) return;
    const ok = await accion(`/api/presupuestos/${anular.id}/anular`);
    if (ok) {
      toast("exito", "Presupuesto anulado");
      setAnular(null);
      router.refresh();
    }
  }

  async function duplicar(p: Presupuesto) {
    const json = await accion(`/api/presupuestos/${p.id}/duplicar`);
    if (json) {
      toast("exito", "Duplicado como borrador");
      router.push(`/presupuestos/${(json.data as { id: string }).id}/editar`);
    }
  }

  return (
    <div>
      <Tabs
        tabs={[
          { key: "presupuestos", label: `Presupuestos (${presupuestos.length})` },
          { key: "plantillas", label: `Plantillas (${plantillas.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "presupuestos" && (
        <div className="mt-5">
          <div className="mb-4 max-w-xs">
            <Input
              placeholder="Buscar por cliente o número..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {visibles.length === 0 ? (
            <EmptyState
              titulo="Sin presupuestos"
              descripcion="Creá el primero para emitirlo a un cliente del estudio."
              accion={
                <Link href="/presupuestos/nuevo">
                  <Button>Nuevo presupuesto</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <TH>N°</TH>
                <TH>Cliente</TH>
                <TH>Fecha</TH>
                <TH>Total</TH>
                <TH>Estado</TH>
                <TH>Creado por</TH>
                <TH className="text-right">Acciones</TH>
              </THead>
              <tbody>
                {visibles.map((p) => (
                  <TRow key={p.id}>
                    <TD className="font-mono font-medium text-primary">{numeroDe(p)}</TD>
                    <TD className="font-medium">{p.destNombre}</TD>
                    <TD className="text-ink-muted">{formatFecha(p.fechaEmision)}</TD>
                    <TD className="font-medium text-primary">{formatGuaranies(p.total)}</TD>
                    <TD>
                      <Badge style={ESTADO_PRESUPUESTO[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge>
                    </TD>
                    <TD className="text-ink-muted">{p.creador.nombre}</TD>
                    <TD>
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Link href={`/presupuestos/${p.id}/imprimir`} target="_blank">
                          <Button size="sm" variant="outline">Ver</Button>
                        </Link>
                        {p.estado === "BORRADOR" && (
                          <>
                            <Link href={`/presupuestos/${p.id}/editar`}>
                              <Button size="sm" variant="ghost">Editar</Button>
                            </Link>
                            <Button size="sm" onClick={() => setEmitir(p)}>Emitir</Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => duplicar(p)} disabled={cargando}>
                          Duplicar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setGuardarPlantilla(p)}>
                          Plantilla
                        </Button>
                        {p.estado !== "ANULADO" && (
                          <Button size="sm" variant="ghost" onClick={() => setAnular(p)}>
                            Anular
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TRow>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      {tab === "plantillas" && (
        <div className="mt-5">
          {plantillas.length === 0 ? (
            <EmptyState
              titulo="Sin plantillas"
              descripcion='Guardá un presupuesto como plantilla con el botón "Plantilla" para reutilizarlo.'
            />
          ) : (
            <Table>
              <THead>
                <TH>Nombre</TH>
                <TH>Ítems</TH>
                <TH>Total de referencia</TH>
                <TH>Creado por</TH>
                <TH className="text-right">Acciones</TH>
              </THead>
              <tbody>
                {plantillas.map((p) => (
                  <TRow key={p.id}>
                    <TD className="font-medium text-primary">{p.nombrePlantilla}</TD>
                    <TD className="text-ink-muted">{p.items.length}</TD>
                    <TD className="font-medium">{formatGuaranies(p.total)}</TD>
                    <TD className="text-ink-muted">{p.creador.nombre}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Link href={`/presupuestos/nuevo?plantilla=${p.id}`}>
                          <Button size="sm">Usar</Button>
                        </Link>
                        <Link href={`/presupuestos/${p.id}/editar`}>
                          <Button size="sm" variant="ghost">Editar</Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => setAnular(p)}>
                          Eliminar
                        </Button>
                      </div>
                    </TD>
                  </TRow>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      {/* Emitir */}
      <Modal open={!!emitir} onClose={() => setEmitir(null)} title="Emitir presupuesto">
        <form onSubmit={confirmarEmitir} className="space-y-4">
          <p className="text-sm text-ink-muted">
            Al emitir se asigna el número correlativo y el documento queda
            congelado (ya no se edita — se duplica para hacer versiones).
          </p>
          <Input
            label="Número manual (opcional)"
            name="numero"
            type="number"
            min={1}
            placeholder="Vacío = siguiente correlativo automático"
            helper="Usalo la primera vez si querés arrancar en un número alto (ej: 700)."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEmitir(null)} disabled={cargando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={cargando}>
              {cargando ? <Spinner className="text-white" /> : "Emitir"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Guardar como plantilla */}
      <Modal open={!!guardarPlantilla} onClose={() => setGuardarPlantilla(null)} title="Guardar como plantilla">
        <form onSubmit={confirmarPlantilla} className="space-y-4">
          <Input label="Nombre de la plantilla" name="nombre" required placeholder="Ej: Habilitación de clínica" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setGuardarPlantilla(null)} disabled={cargando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={cargando}>
              {cargando ? <Spinner className="text-white" /> : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Anular */}
      <Modal open={!!anular} onClose={() => setAnular(null)} title={anular?.esPlantilla ? "Eliminar plantilla" : "Anular presupuesto"}>
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            {anular?.esPlantilla
              ? "La plantilla dejará de aparecer en la lista."
              : "El presupuesto queda marcado como anulado y conserva su número. No se puede deshacer."}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAnular(null)} disabled={cargando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarAnular} disabled={cargando}>
              {cargando ? <Spinner className="text-white" /> : anular?.esPlantilla ? "Eliminar" : "Anular"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
