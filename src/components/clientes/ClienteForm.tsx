"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TipoObligacion } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { OBLIGACIONES_LABELS, type AccesosCliente } from "@/lib/clientes-ui";

interface UsuarioOption {
  id: string;
  nombre: string;
}

interface ClienteFormValues {
  nombre: string;
  ruc: string;
  cedula: string;
  telefono: string;
  email: string;
  direccion: string;
  tipo: string;
  estado: string;
  estadoFiscal: string;
  responsableId: string;
  obligaciones: { tipo: string; diaVencimiento: number | null }[];
  accesos: AccesosCliente | null;
  observaciones: string;
  timbradoNumero: string;
  timbradoVencimiento: string; // yyyy-MM-dd, para <input type="date">
  firmaDigitalVencimiento: string;
}

interface ClienteFormProps {
  usuarios: UsuarioOption[];
  esAdmin: boolean;
  clienteId?: string; // presente = edición
  inicial?: Partial<ClienteFormValues>;
}

const SISTEMAS_ACCESO = [
  { key: "marangatu", label: "Marangatu" },
  { key: "set", label: "SET" },
  { key: "ips", label: "IPS" },
  { key: "mites", label: "MITES" },
] as const;

export function ClienteForm({ usuarios, esAdmin, clienteId, inicial }: ClienteFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [obligaciones, setObligaciones] = useState<Record<string, number | null>>(
    Object.fromEntries((inicial?.obligaciones ?? []).map((o) => [o.tipo, o.diaVencimiento]))
  );
  const [accesos, setAccesos] = useState<AccesosCliente>(inicial?.accesos ?? {});

  function toggleObligacion(tipo: string) {
    setObligaciones((prev) => {
      if (tipo in prev) {
        const { [tipo]: _quitado, ...resto } = prev;
        return resto;
      }
      return { ...prev, [tipo]: null };
    });
  }

  function setDiaVencimiento(tipo: string, valor: string) {
    const dia = valor === "" ? null : Number(valor);
    setObligaciones((prev) => ({ ...prev, [tipo]: dia }));
  }

  function setAcceso(sistema: string, campo: "usuario" | "clave", valor: string) {
    setAccesos((prev) => {
      const key = sistema as keyof AccesosCliente;
      const actual = (prev[key] as { usuario: string; clave: string }) ?? {
        usuario: "",
        clave: "",
      };
      return { ...prev, [key]: { ...actual, [campo]: valor } };
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      nombre: form.get("nombre"),
      ruc: form.get("ruc"),
      cedula: form.get("cedula"),
      telefono: form.get("telefono"),
      email: form.get("email"),
      direccion: form.get("direccion"),
      observaciones: form.get("observaciones"),
      tipo: form.get("tipo"),
      estado: form.get("estado"),
      estadoFiscal: form.get("estadoFiscal"),
      responsableId: form.get("responsableId"),
      obligaciones: Object.entries(obligaciones).map(([tipo, diaVencimiento]) => ({
        tipo,
        diaVencimiento,
      })),
      timbradoNumero: form.get("timbradoNumero"),
      timbradoVencimiento: form.get("timbradoVencimiento")
        ? `${form.get("timbradoVencimiento")}T12:00:00Z`
        : null,
      firmaDigitalVencimiento: form.get("firmaDigitalVencimiento")
        ? `${form.get("firmaDigitalVencimiento")}T12:00:00Z`
        : null,
      ...(esAdmin ? { accesos } : {}),
    };

    const res = await fetch(clienteId ? `/api/clientes/${clienteId}` : "/api/clientes", {
      method: clienteId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setError(json?.error ?? "Ocurrió un error al guardar");
      setGuardando(false);
      return;
    }

    toast("exito", clienteId ? "Cliente actualizado" : "Cliente creado");
    router.push(`/clientes/${clienteId ?? json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <Card>
        <h3 className="font-heading font-semibold text-primary mb-4">Datos generales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nombre / Razón social"
              name="nombre"
              defaultValue={inicial?.nombre}
              required
            />
          </div>
          <Input label="RUC" name="ruc" defaultValue={inicial?.ruc} placeholder="80012345-7" required />
          <Input label="Cédula" name="cedula" defaultValue={inicial?.cedula} />
          <Input label="Teléfono" name="telefono" defaultValue={inicial?.telefono} />
          <Input label="Correo" name="email" type="email" defaultValue={inicial?.email} />
          <div className="md:col-span-2">
            <Input label="Dirección" name="direccion" defaultValue={inicial?.direccion} />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Observaciones"
              name="observaciones"
              defaultValue={inicial?.observaciones}
              placeholder='Ej: "Cliente puntual", "Falta info de X", situación de pagos...'
              helper="Notas internas del equipo — no las ve el cliente."
            />
          </div>
          <Select label="Tipo" name="tipo" defaultValue={inicial?.tipo ?? "CONTABLE"} required>
            <option value="CONTABLE">Contable</option>
            <option value="JURIDICO">Jurídico</option>
            <option value="AMBOS">Mixto</option>
          </Select>
          <Select label="Responsable" name="responsableId" defaultValue={inicial?.responsableId ?? ""} required>
            <option value="" disabled>
              Seleccionar...
            </option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
          <Select label="Estado" name="estado" defaultValue={inicial?.estado ?? "ACTIVO"}>
            <option value="ACTIVO">Activo</option>
            <option value="PROSPECTO">Prospecto</option>
            <option value="INACTIVO">Inactivo</option>
          </Select>
          <Select label="Estado fiscal" name="estadoFiscal" defaultValue={inicial?.estadoFiscal ?? "AL_DIA"}>
            <option value="AL_DIA">Al día</option>
            <option value="ATRASADO">Atrasado</option>
            <option value="CCT">CCT</option>
            <option value="VECTOR_FISCAL">Vector Fiscal</option>
          </Select>
        </div>
      </Card>

      <Card>
        <h3 className="font-heading font-semibold text-primary mb-1">Timbrado y Firma Digital</h3>
        <p className="text-xs text-ink-muted mb-4">
          Credenciales de facturación electrónica. Sin vigentes, el cliente no
          puede facturar — el sistema avisa 7/3/1 día antes del vencimiento,
          igual que el resto de los vencimientos.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Número de Timbrado" name="timbradoNumero" defaultValue={inicial?.timbradoNumero} />
          <Input
            label="Vence Timbrado"
            name="timbradoVencimiento"
            type="date"
            defaultValue={inicial?.timbradoVencimiento}
          />
          <Input
            label="Vence Firma Digital"
            name="firmaDigitalVencimiento"
            type="date"
            defaultValue={inicial?.firmaDigitalVencimiento}
          />
        </div>
      </Card>

      <Card>
        <h3 className="font-heading font-semibold text-primary mb-1">Obligaciones activas</h3>
        <p className="text-xs text-ink-muted mb-4">
          Determinan el checklist mensual. Configurá el día de vencimiento de
          cada una (vence el mes siguiente al período) para que el sistema
          avise solo cuando se atrasan — dejalo vacío en IVA para usar el
          calendario automático por RUC.
        </p>
        <div className="space-y-2">
          {Object.entries(OBLIGACIONES_LABELS).map(([tipo, label]) => {
            const marcada = tipo in obligaciones;
            return (
              <div
                key={tipo}
                className={`flex items-center gap-3 rounded-control border px-3 py-2 transition-colors ${
                  marcada ? "border-gold bg-[#FEF3C7]/40" : "border-line"
                }`}
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => toggleObligacion(tipo)}
                    className="accent-[#C9A84C]"
                  />
                  <span className={marcada ? "text-primary font-medium" : "text-ink-muted"}>
                    {label}
                  </span>
                </label>
                {marcada && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-ink-faint whitespace-nowrap">Vence día</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={obligaciones[tipo] ?? ""}
                      onChange={(e) => setDiaVencimiento(tipo, e.target.value)}
                      placeholder={tipo === "IVA" ? "auto" : "—"}
                      className="w-16 h-8 rounded-control border border-line px-2 text-sm text-center focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {esAdmin && (
        <Card>
          <h3 className="font-heading font-semibold text-primary mb-1">
            Accesos internos
          </h3>
          <p className="text-xs text-ink-muted mb-4">
            Credenciales de sistemas externos. Se guardan cifradas — solo visibles
            para administradores.
          </p>
          <div className="space-y-3">
            {SISTEMAS_ACCESO.map((s) => (
              <div key={s.key} className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr] gap-2 items-center">
                <span className="text-sm font-medium text-ink-muted">{s.label}</span>
                <input
                  placeholder="Usuario"
                  value={(accesos[s.key] as { usuario?: string })?.usuario ?? ""}
                  onChange={(e) => setAcceso(s.key, "usuario", e.target.value)}
                  className="h-9 rounded-control border border-line px-3 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  placeholder="Clave"
                  type="password"
                  value={(accesos[s.key] as { clave?: string })?.clave ?? ""}
                  onChange={(e) => setAcceso(s.key, "clave", e.target.value)}
                  className="h-9 rounded-control border border-line px-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 items-center">
              <span className="text-sm font-medium text-ink-muted">Otros</span>
              <input
                placeholder="Notas de otros accesos"
                value={accesos.otros ?? ""}
                onChange={(e) => setAccesos((prev) => ({ ...prev, otros: e.target.value }))}
                className="h-9 rounded-control border border-line px-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </Card>
      )}

      {error && (
        <p className="rounded-control bg-[#FEE2E2] px-4 py-3 text-sm text-urgent">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? <Spinner className="text-white" /> : clienteId ? "Guardar cambios" : "Crear cliente"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
