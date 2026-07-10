"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Perfil {
  razonSocial: string | null;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  logoPublicId: string | null;
  updatedAt: string;
}

export function PerfilEstudioForm({ perfil }: { perfil: Perfil | null }) {
  const router = useRouter();
  const toast = useToast();
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardando(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/estudio/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razonSocial: form.get("razonSocial"),
        ruc: form.get("ruc"),
        telefono: form.get("telefono"),
        email: form.get("email"),
        direccion: form.get("direccion"),
        ciudad: form.get("ciudad"),
      }),
    });
    setGuardando(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast("error", json?.error ?? "No se pudo guardar");
      return;
    }
    toast("exito", "Perfil actualizado");
    router.refresh();
  }

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendoLogo(true);
    const form = new FormData();
    form.append("archivo", archivo);
    const res = await fetch("/api/estudio/logo", { method: "POST", body: form });
    setSubiendoLogo(false);
    if (inputLogoRef.current) inputLogoRef.current.value = "";

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast("error", json?.error ?? "No se pudo subir el logo");
      return;
    }
    toast("exito", "Logo actualizado");
    router.refresh();
  }

  async function quitarLogo() {
    const res = await fetch("/api/estudio/logo", { method: "DELETE" });
    if (!res.ok) {
      toast("error", "No se pudo quitar el logo");
      return;
    }
    toast("exito", "Logo quitado");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <Card className="lg:col-span-2">
        <h3 className="font-heading font-semibold text-primary mb-1">Datos del emisor</h3>
        <p className="text-xs text-ink-muted mb-4">
          Estos datos encabezan los presupuestos que emite el estudio.
        </p>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Razón social" name="razonSocial" defaultValue={perfil?.razonSocial ?? ""} placeholder="Criterio Asesores S.R.L." />
            <Input label="RUC" name="ruc" defaultValue={perfil?.ruc ?? ""} placeholder="80012345-6" />
            <Input label="Teléfono" name="telefono" defaultValue={perfil?.telefono ?? ""} placeholder="0981 123 456" />
            <Input label="Email" name="email" type="email" defaultValue={perfil?.email ?? ""} placeholder="contacto@estudio.com.py" />
            <Input label="Dirección" name="direccion" defaultValue={perfil?.direccion ?? ""} placeholder="Av. Mcal. López 1234" />
            <Input label="Ciudad" name="ciudad" defaultValue={perfil?.ciudad ?? ""} placeholder="Asunción" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner className="text-white" /> : "Guardar"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="font-heading font-semibold text-primary mb-1">Logo</h3>
        <p className="text-xs text-ink-muted mb-4">PNG o JPG, máx. 2 MB. Aparece en el encabezado del presupuesto.</p>

        {perfil?.logoPublicId ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/estudio/logo?v=${encodeURIComponent(perfil.updatedAt)}`}
              alt="Logo del estudio"
              className="max-h-24 rounded-control border border-line bg-white p-2"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => inputLogoRef.current?.click()} disabled={subiendoLogo}>
                {subiendoLogo ? <Spinner /> : "Cambiar"}
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={quitarLogo}>
                Quitar
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" type="button" onClick={() => inputLogoRef.current?.click()} disabled={subiendoLogo}>
            {subiendoLogo ? <Spinner className="text-white" /> : "Subir logo"}
          </Button>
        )}

        <input
          ref={inputLogoRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={subirLogo}
        />
      </Card>
    </div>
  );
}
