"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TipoExpediente, EstadoExpediente } from "@prisma/client";
import { TIPO_EXPEDIENTE_LABELS, ESTADO_EXPEDIENTE_LABELS } from "@/lib/expedientes";
import { ESTADO_EXPEDIENTE } from "@/lib/badges";
import { formatFecha } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TH, TRow, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface Expediente {
  id: string;
  titulo: string;
  tipo: TipoExpediente;
  estado: EstadoExpediente;
  fechaLimite: string | null;
  cliente: { id: string; nombre: string };
  responsable: { id: string; nombre: string };
  _count: { documentos: number; tareas: number };
}

interface Props {
  expedientes: Expediente[];
  usuarios: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string }[];
  miUserId: string;
}

export function ExpedientesLista({ expedientes, usuarios, clientes, miUserId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/expedientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.get("titulo"),
        clienteId: form.get("clienteId"),
        tipo: form.get("tipo"),
        responsableId: form.get("responsableId"),
        fechaInicio: `${form.get("fechaInicio")}T12:00:00Z`,
        fechaLimite: form.get("fechaLimite") ? `${form.get("fechaLimite")}T12:00:00Z` : null,
      }),
    });

    const json = await res.json().catch(() => null);
    setGuardando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo crear el expediente");
      return;
    }

    toast("exito", "Expediente creado");
    setModalNuevo(false);
    router.push(`/expedientes/${json.data.id}`);
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setModalNuevo(true)}>Nuevo expediente</Button>
      </div>

      {expedientes.length === 0 ? (
        <EmptyState
          titulo="Sin expedientes"
          descripcion="Creá el primer expediente para empezar a llevar el seguimiento interno de un caso (el número oficial de causa se sigue gestionando en Judisoft)."
          accion={<Button onClick={() => setModalNuevo(true)}>Nuevo expediente</Button>}
        />
      ) : (
        <Table>
          <THead>
            <TH>Título</TH>
            <TH>Cliente</TH>
            <TH>Tipo</TH>
            <TH>Estado</TH>
            <TH>Responsable</TH>
            <TH>Límite</TH>
            <TH className="text-right">Docs / Tareas</TH>
          </THead>
          <tbody>
            {expedientes.map((e) => (
              <TRow key={e.id} onClick={() => router.push(`/expedientes/${e.id}`)}>
                <TD className="font-medium text-primary">{e.titulo}</TD>
                <TD>{e.cliente.nombre}</TD>
                <TD>{TIPO_EXPEDIENTE_LABELS[e.tipo]}</TD>
                <TD>
                  <Badge style={ESTADO_EXPEDIENTE[e.estado]}>{ESTADO_EXPEDIENTE_LABELS[e.estado]}</Badge>
                </TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <Avatar nombre={e.responsable.nombre} size="sm" />
                    <span>{e.responsable.nombre}</span>
                  </div>
                </TD>
                <TD className="text-ink-muted">{e.fechaLimite ? formatFecha(e.fechaLimite) : "—"}</TD>
                <TD className="text-right text-ink-muted">
                  {e._count.documentos} / {e._count.tareas}
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      )}

      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo expediente">
        <form onSubmit={crear} className="space-y-4">
          <Input label="Título" name="titulo" required placeholder="Ej: Demanda laboral c/ Fulano" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Cliente" name="clienteId" required defaultValue="">
              <option value="" disabled>
                Elegir cliente...
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <Select label="Tipo" name="tipo" defaultValue="OTRO">
              {Object.entries(TIPO_EXPEDIENTE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select label="Responsable" name="responsableId" defaultValue={miUserId} required>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Select>
            <Input label="Fecha de inicio" name="fechaInicio" type="date" required />
            <Input label="Fecha límite (opcional)" name="fechaLimite" type="date" />
          </div>

          {error && (
            <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalNuevo(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Creando..." : "Crear expediente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
