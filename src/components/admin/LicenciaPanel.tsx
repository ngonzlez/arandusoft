"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EstadoLicencia } from "@prisma/client";
import { FEATURES_DISPONIBLES, type Feature } from "@/lib/features";
import { formatFecha, formatGuaranies } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Pago {
  id: string;
  monto: number;
  fechaPago: string;
  nota: string | null;
  registrador: { nombre: string } | null;
}

interface Licencia {
  id: string;
  estado: EstadoLicencia;
  venceEl: string;
  mensajeSuspension: string | null;
  nombreEstudio: string;
  dominio: string | null;
  features: string[];
  pagos: Pago[];
}

const ESTADO_BADGE: Record<EstadoLicencia, { bg: string; text: string }> = {
  ACTIVA: { bg: "#DCFCE7", text: "#15803D" },
  POR_VENCER: { bg: "#FEF3C7", text: "#A16207" },
  SUSPENDIDA: { bg: "#FEE2E2", text: "#DC2626" },
};

export function LicenciaPanel({ licencia }: { licencia: Licencia | null }) {
  const router = useRouter();
  const toast = useToast();
  const [modalSuspender, setModalSuspender] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [features, setFeatures] = useState<string[]>(licencia?.features ?? []);

  if (!licencia) {
    return (
      <Card>
        <p className="text-sm text-urgent">
          No hay licencia creada. Corré el seed (`npm run db:seed`) para inicializarla.
        </p>
      </Card>
    );
  }

  async function llamar(url: string, body?: unknown): Promise<boolean> {
    setCargando(true);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    setCargando(false);

    if (!res.ok) {
      setError(json?.error ?? "Error");
      toast("error", json?.error ?? "Error");
      return false;
    }
    return true;
  }

  async function suspender(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (await llamar("/api/admin/licencia/suspender", { mensaje: form.get("mensaje") })) {
      toast("exito", "Acceso suspendido");
      setModalSuspender(false);
      router.refresh();
    }
  }

  async function reactivar() {
    if (await llamar("/api/admin/licencia/activar")) {
      toast("exito", "Acceso reactivado");
      router.refresh();
    }
  }

  async function registrarPago(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const ok = await llamar("/api/admin/licencia", {
      monto: Number(form.get("monto")),
      fechaPago: `${form.get("fechaPago")}T12:00:00Z`,
      nuevoVencimiento: `${form.get("nuevoVencimiento")}T12:00:00Z`,
      nota: form.get("nota"),
    });
    if (ok) {
      toast("exito", "Pago registrado y licencia extendida");
      setModalPago(false);
      router.refresh();
    }
  }

  async function guardarConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGuardandoConfig(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/licencia", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombreEstudio: form.get("nombreEstudio"),
        dominio: form.get("dominio"),
        features,
      }),
    });
    setGuardandoConfig(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast("error", json?.error ?? "No se pudo guardar");
      return;
    }
    toast("exito", "Configuración actualizada");
    router.refresh();
  }

  const suspendida = licencia.estado === "SUSPENDIDA";

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-lg font-bold text-primary">Estado de la licencia</h2>
              <Badge style={ESTADO_BADGE[licencia.estado]}>{licencia.estado}</Badge>
            </div>
            <p className="text-sm text-ink-muted mt-1">
              Vence el <strong className="text-ink-base">{formatFecha(licencia.venceEl)}</strong>
            </p>
            {suspendida && licencia.mensajeSuspension && (
              <p className="text-xs text-urgent mt-1">
                Mensaje mostrado: “{licencia.mensajeSuspension}”
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setModalPago(true)} disabled={cargando}>
              Registrar pago
            </Button>
            {suspendida ? (
              <Button onClick={reactivar} disabled={cargando}>
                {cargando ? <Spinner className="text-white" /> : "Reactivar acceso"}
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setModalSuspender(true)} disabled={cargando}>
                Suspender acceso
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-heading font-semibold text-primary mb-1">Configuración del estudio</h3>
        <p className="text-xs text-ink-muted mb-4">
          Nombre y dominio son solo informativos (branding). Los módulos
          prenden/apagan features completas para este cliente (menú + API) —
          así vendés distintos planes sin redeploy.
        </p>
        <form onSubmit={guardarConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre del estudio" name="nombreEstudio" defaultValue={licencia.nombreEstudio} required />
            <Input
              label="Dominio (opcional)"
              name="dominio"
              defaultValue={licencia.dominio ?? ""}
              placeholder="panel.criterioasesores.com.py"
            />
          </div>

          <div className="space-y-2">
            {(Object.entries(FEATURES_DISPONIBLES) as [Feature, { label: string; descripcion: string }][]).map(
              ([key, meta]) => {
                const activa = features.includes(key);
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-control border border-line px-4 py-3 cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-base">{meta.label}</p>
                      <p className="text-xs text-ink-muted">{meta.descripcion}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFeatures((prev) =>
                          activa ? prev.filter((f) => f !== key) : [...prev, key]
                        )
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
                        activa ? "bg-success" : "bg-line"
                      }`}
                      role="switch"
                      aria-checked={activa}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          activa ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </label>
                );
              }
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={guardandoConfig}>
              {guardandoConfig ? <Spinner className="text-white" /> : "Guardar configuración"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="font-heading font-semibold text-primary mb-4">
          Historial de pagos ({licencia.pagos.length})
        </h3>
        {licencia.pagos.length === 0 ? (
          <p className="text-sm text-ink-faint">Sin pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  {["Fecha", "Monto", "Nota", "Registrado por"].map((h) => (
                    <th key={h} className="py-2 px-3 text-left font-medium text-ink-muted text-xs uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {licencia.pagos.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 px-3">{formatFecha(p.fechaPago)}</td>
                    <td className="py-2 px-3 font-medium text-primary">{formatGuaranies(p.monto)}</td>
                    <td className="py-2 px-3 text-ink-muted">{p.nota ?? "—"}</td>
                    <td className="py-2 px-3 text-ink-muted">{p.registrador?.nombre ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Suspender */}
      <Modal open={modalSuspender} onClose={() => setModalSuspender(false)} title="Suspender acceso">
        <form onSubmit={suspender} className="space-y-4">
          <p className="text-sm text-ink-muted">
            Todos los usuarios del cliente serán redirigidos a la pantalla de
            suspensión. Los datos quedan intactos y el acceso se restablece al
            reactivar.
          </p>
          <Textarea
            label="Mensaje personalizado (opcional)"
            name="mensaje"
            placeholder="Ej: El acceso fue suspendido por falta de pago del mes de julio..."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalSuspender(false)} disabled={cargando}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={cargando}>
              {cargando ? <Spinner className="text-white" /> : "Suspender"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Registrar pago */}
      <Modal open={modalPago} onClose={() => setModalPago(false)} title="Registrar pago">
        <form onSubmit={registrarPago} className="space-y-4">
          <Input label="Monto (Gs.)" name="monto" type="number" min={1} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha de pago" name="fechaPago" type="date" required />
            <Input label="Nuevo vencimiento" name="nuevoVencimiento" type="date" required />
          </div>
          <Input label="Nota (opcional)" name="nota" placeholder="Ej: Mantenimiento julio 2026" />

          {error && (
            <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalPago(false)} disabled={cargando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={cargando}>
              {cargando ? <Spinner className="text-white" /> : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
