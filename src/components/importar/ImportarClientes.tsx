"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface FilaValida {
  fila: number;
  nombre: string;
  ruc: string;
  tipo: string;
  obligaciones: string[];
}

interface FilaError {
  fila: number;
  errores: string[];
  datos: Record<string, string>;
}

type Paso = "subir" | "preview" | "resultado";

export function ImportarClientes() {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [paso, setPaso] = useState<Paso>("subir");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validas, setValidas] = useState<FilaValida[]>([]);
  const [errores, setErrores] = useState<FilaError[]>([]);
  const [importados, setImportados] = useState(0);

  async function subirPreview(file: File) {
    setError(null);
    setCargando(true);
    setArchivo(file);

    const form = new FormData();
    form.set("archivo", file);

    const res = await fetch("/api/importar?modo=preview", { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    setCargando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo procesar el archivo");
      return;
    }

    setValidas(json.data.validas);
    setErrores(json.data.errores);
    setPaso("preview");
  }

  async function confirmar() {
    if (!archivo) return;
    setCargando(true);

    const form = new FormData();
    form.set("archivo", archivo);

    const res = await fetch("/api/importar?modo=confirmar", { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    setCargando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo importar");
      return;
    }

    setImportados(json.data.importados);
    setPaso("resultado");
    toast("exito", `${json.data.importados} clientes importados`);
    router.refresh();
  }

  if (paso === "resultado") {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-heading text-lg font-semibold text-primary">
            {importados} cliente{importados === 1 ? "" : "s"} importado{importados === 1 ? "" : "s"}
          </p>
          {errores.length > 0 && (
            <p className="text-sm text-ink-muted mt-1">
              {errores.length} fila{errores.length === 1 ? "" : "s"} con error quedaron sin importar
            </p>
          )}
          <div className="flex justify-center gap-2 mt-6">
            <Button onClick={() => router.push("/clientes")}>Ver clientes</Button>
            <Button
              variant="outline"
              onClick={() => {
                setPaso("subir");
                setArchivo(null);
                setValidas([]);
                setErrores([]);
              }}
            >
              Importar otro archivo
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {paso === "subir" && (
        <Card>
          <div className="text-center py-8">
            <p className="text-sm text-ink-muted mb-4">
              El archivo debe seguir la plantilla: columnas Nombre, RUC, Cédula,
              Teléfono, Correo, Dirección, Tipo y Obligaciones (separadas por coma).
            </p>
            <div className="flex justify-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) subirPreview(f);
                }}
              />
              <Button onClick={() => inputRef.current?.click()} disabled={cargando}>
                {cargando ? <Spinner className="text-white" /> : "Elegir archivo .xlsx"}
              </Button>
              <a href="/api/importar/plantilla" download>
                <Button variant="outline">Descargar plantilla</Button>
              </a>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <p className="rounded-control bg-[#FEE2E2] px-4 py-3 text-sm text-urgent">{error}</p>
      )}

      {paso === "preview" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-[#15803D]">{validas.length} válidas</span>
              {" · "}
              <span className={`font-semibold ${errores.length ? "text-urgent" : "text-ink-faint"}`}>
                {errores.length} con error
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setPaso("subir");
                  setArchivo(null);
                }}
                disabled={cargando}
              >
                Cancelar
              </Button>
              <Button onClick={confirmar} disabled={cargando || validas.length === 0}>
                {cargando ? (
                  <Spinner className="text-white" />
                ) : (
                  `Importar ${validas.length} cliente${validas.length === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          </div>

          {validas.length > 0 && (
            <div className="overflow-x-auto rounded-card border border-line bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-[#DCFCE7]/50">
                    {["Fila", "Nombre", "RUC", "Tipo", "Obligaciones"].map((h) => (
                      <th key={h} className="py-2.5 px-4 text-left font-medium text-ink-muted text-xs uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validas.map((f) => (
                    <tr key={f.fila} className="border-b border-line/60 last:border-0">
                      <td className="py-2 px-4 text-ink-faint">{f.fila}</td>
                      <td className="py-2 px-4 font-medium text-primary">{f.nombre}</td>
                      <td className="py-2 px-4 text-ink-muted">{f.ruc}</td>
                      <td className="py-2 px-4 text-ink-muted">{f.tipo}</td>
                      <td className="py-2 px-4 text-xs text-ink-muted">
                        {f.obligaciones.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {errores.length > 0 && (
            <div className="overflow-x-auto rounded-card border border-urgent/30 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-[#FEE2E2]/50">
                    {["Fila", "Nombre", "RUC", "Errores"].map((h) => (
                      <th key={h} className="py-2.5 px-4 text-left font-medium text-ink-muted text-xs uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {errores.map((f) => (
                    <tr key={f.fila} className="border-b border-line/60 last:border-0">
                      <td className="py-2 px-4 text-ink-faint">{f.fila}</td>
                      <td className="py-2 px-4">{f.datos.nombre || "—"}</td>
                      <td className="py-2 px-4 text-ink-muted">{f.datos.ruc || "—"}</td>
                      <td className="py-2 px-4 text-xs text-urgent">{f.errores.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
