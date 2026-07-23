"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface CasoCsj {
  codCasoJudicial: number;
  origen: number;
  esCorte: number;
  caratula: string;
  nroExpedienteNumero: number;
  nroExpedienteAnio: number;
  descripcionCircunscripcion?: string;
  descripcionDespacho?: string;
}

interface Props {
  clientes: { id: string; nombre: string }[];
}

export function ImportarCsjButton({ clientes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [vinculado, setVinculado] = useState<boolean | null>(null);
  const [matricula, setMatricula] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [casos, setCasos] = useState<CasoCsj[]>([]);
  const [importando, setImportando] = useState<number | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [importandoLote, setImportandoLote] = useState(false);

  const keyOf = (c: CasoCsj) => `${c.codCasoJudicial}-${c.origen}-${c.esCorte}`;
  function toggleSel(c: CasoCsj) {
    const k = keyOf(c);
    setSeleccion((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  async function abrir() {
    setOpen(true);
    setError(null);
    setCargando(true);
    const res = await fetch("/api/csj/vincular");
    const json = await res.json().catch(() => null);
    setCargando(false);
    if (res.ok) {
      setVinculado(json.data.vinculado);
      setMatricula(json.data.matricula);
      if (json.data.vinculado) cargarCasos();
    } else {
      setError(json?.error ?? "Error");
    }
  }

  async function vincular(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/csj/vincular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: form.get("usuario"), clave: form.get("clave") }),
    });
    const json = await res.json().catch(() => null);
    setCargando(false);
    if (!res.ok) {
      setError(json?.error ?? "No se pudo vincular la cuenta CSJ");
      return;
    }
    toast("exito", `Cuenta CSJ vinculada: ${json.data.nombreUsuario}`);
    setVinculado(true);
    setMatricula(json.data.matricula);
    cargarCasos();
  }

  async function desvincular() {
    setCargando(true);
    await fetch("/api/csj/vincular", { method: "DELETE" }).catch(() => null);
    setCargando(false);
    setVinculado(false);
    setMatricula(null);
    setCasos([]);
    setError(null);
    toast("info", "Cuenta CSJ desvinculada");
  }

  async function cargarCasos(caratula?: string) {
    setError(null);
    setCargando(true);
    const url = caratula ? `/api/csj/casos?caratula=${encodeURIComponent(caratula)}` : "/api/csj/casos";
    const res = await fetch(url);
    const json = await res.json().catch(() => null);
    setCargando(false);
    if (!res.ok) {
      setError(json?.error ?? "Error consultando CSJ");
      return;
    }
    setCasos(json.data ?? []);
  }

  function buscar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim();
    cargarCasos(q || undefined);
  }

  async function importar(caso: CasoCsj) {
    setImportando(caso.codCasoJudicial);
    setError(null);
    const res = await fetch("/api/csj/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        casoId: caso.codCasoJudicial,
        instancia: `${caso.origen}:${caso.esCorte}`,
        clienteId: clienteId || null,
      }),
    });
    const json = await res.json().catch(() => null);
    setImportando(null);
    if (!res.ok) {
      setError(json?.error ?? "No se pudo importar el expediente");
      return;
    }
    toast(
      "exito",
      json.data.creado
        ? `Importado (${json.data.actuaciones} actuaciones)`
        : `Re-sincronizado (${json.data.actuaciones} actuaciones)`
    );
    setOpen(false);
    router.refresh();
  }

  function toggleTodos() {
    setSeleccion((prev) => (prev.size === casos.length ? new Set() : new Set(casos.map(keyOf))));
  }

  async function importarLote() {
    const sel = casos.filter((c) => seleccion.has(keyOf(c)));
    if (!sel.length) return;
    setImportandoLote(true);
    setError(null);
    const res = await fetch("/api/csj/importar-lote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        casos: sel.map((c) => ({ casoId: c.codCasoJudicial, instancia: `${c.origen}:${c.esCorte}` })),
        clienteId: clienteId || null,
      }),
    });
    const json = await res.json().catch(() => null);
    setImportandoLote(false);
    if (!res.ok) {
      setError(json?.error ?? "Error importando el lote");
      return;
    }
    const d = json.data;
    toast(
      "exito",
      `Importados ${d.importados}, actualizados ${d.actualizados}${
        d.errores.length ? `, ${d.errores.length} con error` : ""
      }`
    );
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={abrir}>
        Importar desde CSJ
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Vincular Cuenta CSJ">
        {cargando && vinculado === null ? (
          <p className="text-sm text-ink-muted">Conectando…</p>
        ) : !vinculado ? (
          <form onSubmit={vincular} className="space-y-4">
            <p className="rounded-control bg-[#EFF6FF] px-3 py-2 text-sm text-[#1D4ED8]">
              Vinculá tu cuenta oficial del Poder Judicial para importar tus expedientes.
            </p>
            <Input label="Usuario / Matrícula" name="usuario" required autoComplete="off" />
            <Input label="Contraseña" name="clave" type="password" required autoComplete="off" />
            {error && (
              <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={cargando}>
                {cargando ? "Verificando…" : "Vincular Cuenta"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-ink-muted">
              <span>Cuenta CSJ: {matricula}</span>
              <button
                type="button"
                onClick={desvincular}
                disabled={cargando}
                className="text-xs font-medium text-urgent hover:underline disabled:opacity-50"
              >
                Desvincular
              </button>
            </div>
            <Select label="Asociar a cliente (opcional)" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Sin cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <form onSubmit={buscar} className="flex gap-2">
              <div className="flex-1">
                <Input name="q" placeholder="Buscar por carátula… (vacío = últimos 10 días)" />
              </div>
              <Button type="submit" variant="outline" disabled={cargando}>
                Buscar
              </Button>
            </form>

            {error && (
              <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>
            )}

            {casos.length > 0 && (
              <div className="flex items-center justify-between">
                <button type="button" onClick={toggleTodos} className="text-xs text-primary hover:underline">
                  {seleccion.size === casos.length ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
                <Button onClick={importarLote} disabled={importandoLote || seleccion.size === 0}>
                  {importandoLote ? "Importando…" : `Importar seleccionados (${seleccion.size})`}
                </Button>
              </div>
            )}

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {cargando ? (
                <p className="text-sm text-ink-muted">Cargando casos…</p>
              ) : casos.length === 0 ? (
                <p className="text-sm text-ink-faint">Sin resultados.</p>
              ) : (
                casos.map((c) => (
                  <div
                    key={`${c.codCasoJudicial}-${c.origen}-${c.esCorte}`}
                    className="flex items-start gap-3 rounded-control border border-line px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={seleccion.has(keyOf(c))}
                      onChange={() => toggleSel(c)}
                      className="mt-1 shrink-0"
                      aria-label="Seleccionar expediente"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.caratula}</p>
                      <p className="text-xs text-ink-faint">
                        N° {c.nroExpedienteNumero}/{c.nroExpedienteAnio}
                        {c.descripcionCircunscripcion ? ` · ${c.descripcionCircunscripcion}` : ""}
                        {c.descripcionDespacho ? ` · ${c.descripcionDespacho}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => importar(c)}
                      disabled={importando === c.codCasoJudicial}
                    >
                      {importando === c.codCasoJudicial ? "Importando…" : "Importar"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
