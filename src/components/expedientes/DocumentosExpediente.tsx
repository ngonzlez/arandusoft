"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatFechaHora } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Documento {
  id: string;
  nombre: string;
  createdAt: string;
  subidor: { nombre: string };
}

export function DocumentosExpediente({
  expedienteId,
  documentos,
}: {
  expedienteId: string;
  documentos: Documento[];
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    const form = new FormData();
    form.append("archivo", archivo);
    form.append("nombre", archivo.name);

    const res = await fetch(`/api/expedientes/${expedienteId}/documentos`, {
      method: "POST",
      body: form,
    });

    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = "";

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast("error", json?.error ?? "No se pudo subir el documento");
      return;
    }

    toast("exito", "Documento subido");
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-primary">
          Documentos {documentos.length > 0 && `(${documentos.length})`}
        </p>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
            className="hidden"
            id="input-documento"
            onChange={subir}
            disabled={subiendo}
          />
          <label htmlFor="input-documento">
            <Button size="sm" disabled={subiendo} type="button">
              {subiendo ? <Spinner className="text-white" /> : "Subir documento"}
            </Button>
          </label>
        </div>
      </div>

      {documentos.length === 0 ? (
        <p className="text-sm text-ink-faint">Sin documentos cargados todavía.</p>
      ) : (
        <div className="rounded-card border border-line divide-y divide-line/60 bg-white">
          {documentos.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-base truncate">{d.nombre}</p>
                <p className="text-xs text-ink-faint">
                  {d.subidor.nombre} · {formatFechaHora(d.createdAt)}
                </p>
              </div>
              <a
                href={`/api/expedientes/${expedienteId}/documentos/${d.id}/descargar`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" type="button">
                  Descargar
                </Button>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
