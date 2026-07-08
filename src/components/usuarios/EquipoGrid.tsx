"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rol } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  tareasActivas: number;
}

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  CONTABLE: "Contable",
  JURIDICO: "Jurídico",
};

const MAX_CARGA = 10; // referencia visual para la barra de carga de trabajo

export function EquipoGrid({ usuarios, miUserId }: { usuarios: Usuario[]; miUserId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [modalAlta, setModalAlta] = useState(false);
  const [editar, setEditar] = useState<Usuario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setGuardando(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.get("nombre"),
        email: form.get("email"),
        password: form.get("password"),
        rol: form.get("rol"),
      }),
    });

    const json = await res.json().catch(() => null);
    setGuardando(false);

    if (!res.ok) {
      setError(json?.error ?? "No se pudo crear el usuario");
      return;
    }

    toast("exito", "Usuario creado");
    setModalAlta(false);
    router.refresh();
  }

  async function actualizar(id: string, cambios: Record<string, unknown>) {
    setGuardando(true);
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    });
    const json = await res.json().catch(() => null);
    setGuardando(false);

    if (!res.ok) {
      toast("error", json?.error ?? "No se pudo actualizar");
      return false;
    }
    toast("exito", "Usuario actualizado");
    router.refresh();
    return true;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setModalAlta(true)}>+ Agregar usuario</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {usuarios.map((u) => (
          <div
            key={u.id}
            className={`bg-white rounded-card border border-line p-5 ${
              !u.activo ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <Avatar nombre={u.nombre} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading font-semibold text-primary truncate">{u.nombre}</p>
                  {u.rol === "ADMIN" && (
                    <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                      Admin
                    </span>
                  )}
                  {!u.activo && (
                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#64748B]">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted">{ROL_LABEL[u.rol]}</p>
                <p className="text-xs text-ink-faint truncate">{u.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditar(u)}>
                Editar
              </Button>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-ink-muted mb-1">
                <span>Carga de trabajo</span>
                <span>{u.tareasActivas} tareas activas</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold transition-all"
                  style={{ width: `${Math.min(100, (u.tareasActivas / MAX_CARGA) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alta */}
      <Modal open={modalAlta} onClose={() => setModalAlta(false)} title="Agregar usuario">
        <form onSubmit={crear} className="space-y-4">
          <Input label="Nombre completo" name="nombre" required />
          <Input
            label="Correo corporativo"
            name="email"
            type="email"
            placeholder="nombre@criterioasesores.com.py"
            required
          />
          <Input
            label="Contraseña inicial"
            name="password"
            type="password"
            minLength={8}
            helper="Mínimo 8 caracteres. El usuario debería cambiarla al ingresar."
            required
          />
          <Select label="Rol" name="rol" defaultValue="CONTABLE" required>
            <option value="CONTABLE">Contable</option>
            <option value="JURIDICO">Jurídico</option>
            <option value="ADMIN">Administrador</option>
          </Select>

          {error && (
            <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAlta(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? <Spinner className="text-white" /> : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edición */}
      <Modal open={!!editar} onClose={() => setEditar(null)} title={editar ? `Editar: ${editar.nombre}` : ""}>
        {editar && (
          <div className="space-y-4">
            <Select
              label="Rol"
              value={editar.rol}
              disabled={editar.id === miUserId}
              onChange={async (e) => {
                if (await actualizar(editar.id, { rol: e.target.value })) {
                  setEditar({ ...editar, rol: e.target.value as Rol });
                }
              }}
            >
              <option value="CONTABLE">Contable</option>
              <option value="JURIDICO">Jurídico</option>
              <option value="ADMIN">Administrador</option>
            </Select>
            {editar.id === miUserId && (
              <p className="text-xs text-ink-faint -mt-2">
                No podés cambiar tu propio rol.
              </p>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const password = form.get("password") as string;
                if (password && (await actualizar(editar.id, { password }))) {
                  (e.target as HTMLFormElement).reset();
                }
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1">
                <Input
                  label="Nueva contraseña"
                  name="password"
                  type="password"
                  minLength={8}
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
              <Button type="submit" variant="outline" disabled={guardando}>
                Cambiar
              </Button>
            </form>

            <div className="pt-3 border-t border-line flex justify-between items-center">
              <p className="text-sm text-ink-muted">
                {editar.activo ? "Usuario activo" : "Usuario dado de baja"}
              </p>
              {editar.id !== miUserId && (
                <Button
                  variant={editar.activo ? "danger" : "primary"}
                  size="sm"
                  disabled={guardando}
                  onClick={async () => {
                    if (await actualizar(editar.id, { activo: !editar.activo })) {
                      setEditar(null);
                    }
                  }}
                >
                  {editar.activo ? "Dar de baja" : "Reactivar"}
                </Button>
              )}
            </div>
            <p className="text-xs text-ink-faint">
              La baja es reversible: el usuario no puede ingresar pero todo su
              historial se conserva.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
