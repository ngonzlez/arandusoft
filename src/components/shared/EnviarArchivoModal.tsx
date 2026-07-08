"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: "declaracion" | "documento";
  archivoId: string;
  descripcionArchivo: string;
}

// Reutilizable: declaraciones hoy, documentos de expedientes en Fase 2.
export function EnviarArchivoModal({ open, onClose, tipo, archivoId, descripcionArchivo }: Props) {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [destinatarioId, setDestinatarioId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((j) => setUsuarios(j.data ?? []))
      .catch(() => setUsuarios([]));
  }, [open]);

  async function enviar() {
    if (!destinatarioId) {
      setError("Elegí un destinatario");
      return;
    }
    setError(null);
    setEnviando(true);

    const res = await fetch("/api/archivos/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, archivoId, destinatarioId, mensaje: mensaje || undefined }),
    });

    const json = await res.json().catch(() => null);
    setEnviando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo enviar");
      return;
    }

    toast("exito", "Archivo enviado por correo");
    setDestinatarioId("");
    setMensaje("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar por correo"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando}>
            {enviando ? <Spinner className="text-white" /> : "Enviar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-control bg-surface px-4 py-3 text-sm text-ink-muted">
          {descripcionArchivo}
        </p>

        <Select
          label="Destinatario"
          value={destinatarioId}
          onChange={(e) => setDestinatarioId(e.target.value)}
        >
          <option value="">Seleccionar usuario...</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre} — {u.email}
            </option>
          ))}
        </Select>

        <Textarea
          label="Mensaje (opcional)"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Nota para el destinatario..."
        />

        {error && (
          <p className="rounded-control bg-[#FBE9EC] px-3 py-2 text-sm text-urgent">{error}</p>
        )}
      </div>
    </Modal>
  );
}
