"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatGuaranies } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { FirmaUpload } from "@/components/presupuestos/FirmaUpload";

interface Item {
  id: string;
  descripcion: string;
  detalle: string;
  cantidad: string; // strings en el form, se numerifican al guardar
  unidad: string;
  precioUnitario: string;
}

interface ClienteOption {
  id: string;
  nombre: string;
  ruc: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
}

interface Emisor {
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
}

export interface PresupuestoInicial {
  id?: string; // presente en modo edición
  esPlantilla?: boolean;
  nombrePlantilla?: string | null;
  clienteId: string | null;
  destNombre: string;
  destRuc: string | null;
  destDireccion: string | null;
  destTelefono: string | null;
  destEmail: string | null;
  validezDias: number;
  items: { id: string; descripcion: string; detalle?: string; cantidad: number; unidad?: string; precioUnitario: number }[];
  descuento: number;
  notas: string | null;
  datosBancarios: string | null;
  firmaDataUrl: string | null;
  firmante: string | null;
}

function itemVacio(): Item {
  return {
    id: `item-${Math.random().toString(36).slice(2, 10)}`,
    descripcion: "",
    detalle: "",
    cantidad: "1",
    unidad: "",
    precioUnitario: "",
  };
}

export function PresupuestoEditor({
  clientes,
  emisor,
  inicial,
}: {
  clientes: ClienteOption[];
  emisor: Emisor;
  inicial: PresupuestoInicial | null;
}) {
  const router = useRouter();
  const toast = useToast();

  const [clienteId, setClienteId] = useState<string>(inicial?.clienteId ?? "");
  const [dest, setDest] = useState({
    nombre: inicial?.destNombre ?? "",
    ruc: inicial?.destRuc ?? "",
    direccion: inicial?.destDireccion ?? "",
    telefono: inicial?.destTelefono ?? "",
    email: inicial?.destEmail ?? "",
  });
  const [items, setItems] = useState<Item[]>(
    inicial?.items?.length
      ? inicial.items.map((it) => ({
          id: it.id,
          descripcion: it.descripcion,
          detalle: it.detalle ?? "",
          cantidad: String(it.cantidad),
          unidad: it.unidad ?? "",
          precioUnitario: String(it.precioUnitario),
        }))
      : [itemVacio()]
  );
  const [descuento, setDescuento] = useState(String(inicial?.descuento ?? 0));
  const [validezDias, setValidezDias] = useState(String(inicial?.validezDias ?? 10));
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [datosBancarios, setDatosBancarios] = useState(inicial?.datosBancarios ?? "");
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(inicial?.firmaDataUrl ?? null);
  const [firmante, setFirmante] = useState(inicial?.firmante ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalPlantilla, setModalPlantilla] = useState(false);
  const [modalEmitir, setModalEmitir] = useState(false);

  const esEdicionPlantilla = !!inicial?.esPlantilla;

  const totales = useMemo(() => {
    const subtotal = items.reduce((acc, it) => {
      const c = Number(it.cantidad) || 0;
      const p = Number(it.precioUnitario) || 0;
      return acc + Math.round(c * p);
    }, 0);
    const d = Number(descuento) || 0;
    return { subtotal, descuento: d, total: Math.max(0, subtotal - d) };
  }, [items, descuento]);

  function elegirCliente(id: string) {
    setClienteId(id);
    if (!id) return;
    const c = clientes.find((x) => x.id === id);
    if (c) {
      setDest({
        nombre: c.nombre,
        ruc: c.ruc ?? "",
        direccion: c.direccion ?? "",
        telefono: c.telefono ?? "",
        email: c.email ?? "",
      });
    }
  }

  function setItem(id: string, campo: keyof Item, valor: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)));
  }

  function armarBody(extra?: Record<string, unknown>) {
    return {
      clienteId: clienteId || null,
      destNombre: dest.nombre,
      destRuc: dest.ruc,
      destDireccion: dest.direccion,
      destTelefono: dest.telefono,
      destEmail: dest.email,
      items: items
        .filter((it) => it.descripcion.trim())
        .map((it) => ({
          id: it.id,
          descripcion: it.descripcion,
          detalle: it.detalle || undefined,
          cantidad: Number(it.cantidad) || 0,
          unidad: it.unidad || undefined,
          precioUnitario: Number(it.precioUnitario) || 0,
        })),
      descuento: Number(descuento) || 0,
      validezDias: Number(validezDias) || 10,
      notas,
      datosBancarios,
      firmaDataUrl,
      firmante,
      ...extra,
    };
  }

  // Guarda (create o update) y devuelve el id, o null si falló.
  async function guardar(extra?: Record<string, unknown>): Promise<string | null> {
    setError(null);
    setGuardando(true);

    const url = inicial?.id ? `/api/presupuestos/${inicial.id}` : "/api/presupuestos";
    const res = await fetch(url, {
      method: inicial?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(armarBody(extra)),
    });
    const json = await res.json().catch(() => null);
    setGuardando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo guardar");
      return null;
    }
    return json.data.id;
  }

  async function guardarBorrador() {
    const id = await guardar();
    if (id) {
      toast("exito", esEdicionPlantilla ? "Plantilla guardada" : "Borrador guardado");
      router.push("/presupuestos");
    }
  }

  async function guardarYEmitir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const numero = form.get("numero")?.toString().trim();

    const id = await guardar();
    if (!id) {
      setModalEmitir(false);
      return;
    }

    setGuardando(true);
    const res = await fetch(`/api/presupuestos/${id}/emitir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(numero ? { numero: Number(numero) } : {}),
    });
    const json = await res.json().catch(() => null);
    setGuardando(false);

    if (!res.ok) {
      setModalEmitir(false);
      setError(json?.error ?? "No se pudo emitir");
      return;
    }
    toast("exito", "Presupuesto emitido");
    window.open(`/presupuestos/${id}/imprimir`, "_blank");
    router.push("/presupuestos");
  }

  async function guardarComoPlantilla(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nombre = form.get("nombre");

    if (inicial?.id) {
      // Editando un borrador existente: guardar cambios y duplicarlo como plantilla
      const id = await guardar();
      if (!id) return;
      setGuardando(true);
      const res = await fetch(`/api/presupuestos/${id}/duplicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comoPlantilla: true, nombrePlantilla: nombre }),
      });
      setGuardando(false);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "No se pudo guardar la plantilla");
        setModalPlantilla(false);
        return;
      }
    } else {
      const id = await guardar({ esPlantilla: true, nombrePlantilla: nombre });
      if (!id) return;
    }

    toast("exito", "Plantilla guardada");
    setModalPlantilla(false);
    router.push("/presupuestos");
  }

  return (
    <div className="space-y-4 pb-24">
      {/* DE | PARA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-primary">De (emisor)</h3>
            <Link href="/configuracion" className="text-xs text-accent hover:underline">
              Editar en Configuración
            </Link>
          </div>
          <div className="text-sm space-y-1">
            <p className="font-semibold text-ink-base">{emisor.nombre}</p>
            {emisor.ruc && <p className="text-ink-muted">RUC: {emisor.ruc}</p>}
            {(emisor.direccion || emisor.ciudad) && (
              <p className="text-ink-muted">
                {[emisor.direccion, emisor.ciudad].filter(Boolean).join(" — ")}
              </p>
            )}
            {(emisor.telefono || emisor.email) && (
              <p className="text-ink-muted">
                {[emisor.telefono, emisor.email].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-heading font-semibold text-primary mb-3">Para (cliente)</h3>
          <div className="space-y-3">
            <Select
              label="Cliente del sistema"
              value={clienteId}
              onChange={(e) => elegirCliente(e.target.value)}
            >
              <option value="">Cargar manualmente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nombre / Razón social"
                value={dest.nombre}
                onChange={(e) => setDest((d) => ({ ...d, nombre: e.target.value }))}
                required
              />
              <Input label="RUC / CI" value={dest.ruc} onChange={(e) => setDest((d) => ({ ...d, ruc: e.target.value }))} />
              <Input label="Teléfono" value={dest.telefono} onChange={(e) => setDest((d) => ({ ...d, telefono: e.target.value }))} />
              <Input label="Email" value={dest.email} onChange={(e) => setDest((d) => ({ ...d, email: e.target.value }))} />
            </div>
          </div>
        </Card>
      </div>

      {/* Ítems */}
      <Card>
        <h3 className="font-heading font-semibold text-primary mb-4">Ítems</h3>
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.id} className="rounded-card border border-line p-3 space-y-2">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    value={it.descripcion}
                    onChange={(e) => setItem(it.id, "descripcion", e.target.value)}
                    placeholder={`Ítem ${idx + 1} — descripción del servicio`}
                    className="w-full h-10 rounded-control border border-line px-3 text-sm font-medium focus:outline-none focus:border-primary"
                  />
                </div>
                <input
                  value={it.cantidad}
                  onChange={(e) => setItem(it.id, "cantidad", e.target.value)}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Cant."
                  className="w-20 h-10 rounded-control border border-line px-2 text-sm text-center focus:outline-none focus:border-primary"
                />
                <input
                  value={it.unidad}
                  onChange={(e) => setItem(it.id, "unidad", e.target.value)}
                  placeholder="Unidad"
                  className="w-24 h-10 rounded-control border border-line px-2 text-sm text-center focus:outline-none focus:border-primary"
                />
                <input
                  value={it.precioUnitario}
                  onChange={(e) => setItem(it.id, "precioUnitario", e.target.value)}
                  type="number"
                  min="0"
                  placeholder="Precio (Gs.)"
                  className="w-36 h-10 rounded-control border border-line px-2 text-sm text-right focus:outline-none focus:border-primary"
                />
                <div className="w-32 h-10 flex items-center justify-end text-sm font-semibold text-primary shrink-0">
                  {formatGuaranies(Math.round((Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0)))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== it.id) : prev))}
                  disabled={items.length === 1}
                >
                  ✕
                </Button>
              </div>
              <input
                value={it.detalle}
                onChange={(e) => setItem(it.id, "detalle", e.target.value)}
                placeholder="Detalle opcional (ej: incluye presentación de carpeta y mesa de entrada)"
                className="w-full h-9 rounded-control border border-line/70 px-3 text-xs text-ink-muted focus:outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setItems((prev) => [...prev, itemVacio()])}>
          + Agregar ítem
        </Button>
      </Card>

      {/* Notas / firma | Totales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="Notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Plazo estimado 30 a 60 días. Los aranceles del MSPBS corren por cuenta del cliente."
                rows={4}
              />
              <Textarea
                label="Datos bancarios"
                value={datosBancarios}
                onChange={(e) => setDatosBancarios(e.target.value)}
                placeholder={"Banco Itaú\nCta. Cte. 123456-7\nTitular: Mi Estudio S.R.L."}
                rows={4}
              />
            </div>
          </Card>
          <Card>
            <FirmaUpload
              firmaDataUrl={firmaDataUrl}
              firmante={firmante}
              onFirmaChange={setFirmaDataUrl}
              onFirmanteChange={setFirmante}
            />
          </Card>
        </div>

        <Card>
          <h3 className="font-heading font-semibold text-primary mb-4">Totales</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Subtotal</span>
              <span className="font-medium">{formatGuaranies(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-ink-muted shrink-0">Descuento (Gs.)</span>
              <input
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                type="number"
                min="0"
                className="w-32 h-9 rounded-control border border-line px-2 text-sm text-right focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-ink-muted shrink-0">Válido por (días)</span>
              <input
                value={validezDias}
                onChange={(e) => setValidezDias(e.target.value)}
                type="number"
                min="1"
                max="365"
                className="w-20 h-9 rounded-control border border-line px-2 text-sm text-center focus:outline-none focus:border-primary"
              />
            </div>
            <div className="border-t border-line pt-3 flex justify-between items-baseline">
              <span className="font-heading font-semibold text-primary">TOTAL</span>
              <span className="font-heading text-xl font-bold text-gold-dark">
                {formatGuaranies(totales.total)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <p className="rounded-control bg-[#FEE2E2] px-4 py-3 text-sm text-urgent">{error}</p>
      )}

      {/* Footer de acciones */}
      <div className="fixed bottom-0 left-0 lg:left-60 right-0 bg-white border-t border-line px-4 lg:px-8 py-3 flex justify-end gap-2 z-40">
        <Link href="/presupuestos">
          <Button variant="ghost" disabled={guardando}>Cancelar</Button>
        </Link>
        {!esEdicionPlantilla && (
          <Button variant="outline" onClick={() => setModalPlantilla(true)} disabled={guardando}>
            Guardar como plantilla
          </Button>
        )}
        <Button variant="secondary" onClick={guardarBorrador} disabled={guardando}>
          {guardando ? <Spinner className="text-white" /> : esEdicionPlantilla ? "Guardar plantilla" : "Guardar borrador"}
        </Button>
        {!esEdicionPlantilla && (
          <Button onClick={() => setModalEmitir(true)} disabled={guardando}>
            Guardar y emitir
          </Button>
        )}
      </div>

      {/* Emitir */}
      <Modal open={modalEmitir} onClose={() => setModalEmitir(false)} title="Emitir presupuesto">
        <form onSubmit={guardarYEmitir} className="space-y-4">
          <p className="text-sm text-ink-muted">
            Se guarda, se asigna el número y el documento queda congelado.
          </p>
          <Input
            label="Número manual (opcional)"
            name="numero"
            type="number"
            min={1}
            placeholder="Vacío = siguiente correlativo automático"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalEmitir(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner className="text-white" /> : "Emitir"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Guardar como plantilla */}
      <Modal open={modalPlantilla} onClose={() => setModalPlantilla(false)} title="Guardar como plantilla">
        <form onSubmit={guardarComoPlantilla} className="space-y-4">
          <Input
            label="Nombre de la plantilla"
            name="nombre"
            required
            defaultValue={inicial?.nombrePlantilla ?? ""}
            placeholder="Ej: Habilitación de clínica"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalPlantilla(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner className="text-white" /> : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
