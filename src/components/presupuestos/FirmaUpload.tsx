"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const MAX_BYTES = 200 * 1024;

// Firma escaneada/foto (PNG o JPG chico) → dataURL que se estampa en el documento.
export function FirmaUpload({
  firmaDataUrl,
  firmante,
  onFirmaChange,
  onFirmanteChange,
}: {
  firmaDataUrl: string | null;
  firmante: string;
  onFirmaChange: (dataUrl: string | null) => void;
  onFirmanteChange: (nombre: string) => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!archivo) return;

    if (!["image/png", "image/jpeg"].includes(archivo.type)) {
      toast("error", "La firma debe ser PNG o JPG");
      return;
    }
    if (archivo.size > MAX_BYTES) {
      toast("error", "La firma supera 200 KB — usá una imagen más chica");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onFirmaChange(reader.result as string);
    reader.readAsDataURL(archivo);
  }

  return (
    <div>
      <p className="text-sm font-semibold text-primary mb-2.5">Firma (opcional)</p>
      <div className="space-y-3">
        {firmaDataUrl ? (
          <div className="flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={firmaDataUrl}
              alt="Firma"
              className="max-h-20 rounded-control border border-line bg-white p-2"
            />
            <Button size="sm" variant="ghost" type="button" onClick={() => onFirmaChange(null)}>
              Quitar
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" type="button" onClick={() => inputRef.current?.click()}>
            Subir imagen de firma
          </Button>
        )}
        <Input
          label="Firmante"
          value={firmante}
          onChange={(e) => onFirmanteChange(e.target.value)}
          placeholder="Ej: Lic. María González — Asesora Comercial"
        />
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={subir} />
    </div>
  );
}
