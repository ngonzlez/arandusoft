"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TipoNotificacion } from "@prisma/client";
import { formatFechaHora } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface Notif {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  entidadTipo: string | null;
  entidadId: string | null;
  leida: boolean;
  createdAt: string;
}

const ICONO_TIPO: Record<TipoNotificacion, string> = {
  VENCIMIENTO_PROXIMO: "📅",
  TAREA_ASIGNADA: "📋",
  TAREA_VENCIDA: "⚠️",
  EXPEDIENTE_ACTUALIZADO: "📁",
  DECLARACION_FALTANTE: "📄",
  ARCHIVO_RECIBIDO: "✉️",
};

// Deep-link según entidad
function hrefDe(n: Notif): string | null {
  if (!n.entidadTipo || !n.entidadId) return null;
  switch (n.entidadTipo) {
    case "Cliente":
      return `/clientes/${n.entidadId}`;
    case "Declaracion":
      return `/api/declaraciones/${n.entidadId}/descargar`;
    case "Vencimiento":
      return "/calendario";
    case "Tarea":
      return "/tareas";
    default:
      return null;
  }
}

export function NotificacionesLista({ notificaciones }: { notificaciones: Notif[] }) {
  const router = useRouter();
  const toast = useToast();
  const [filtro, setFiltro] = useState<"todas" | "noLeidas">("todas");
  const [marcando, setMarcando] = useState(false);

  const visibles =
    filtro === "noLeidas" ? notificaciones.filter((n) => !n.leida) : notificaciones;
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function marcarTodas() {
    setMarcando(true);
    const res = await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todas: true }),
    });
    setMarcando(false);
    if (!res.ok) {
      toast("error", "No se pudo actualizar");
      return;
    }
    router.refresh();
  }

  async function marcarLeida(id: string) {
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(
            [
              ["todas", "Todas"],
              ["noLeidas", `No leídas (${noLeidas})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filtro === key
                  ? "bg-primary text-white"
                  : "bg-white border border-line text-ink-muted hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {noLeidas > 0 && (
          <Button variant="outline" size="sm" onClick={marcarTodas} disabled={marcando}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {visibles.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Sin notificaciones"
            descripcion="Las alertas de vencimientos, tareas y archivos recibidos aparecen acá."
          />
        </Card>
      ) : (
        <div className="bg-white rounded-card border border-line divide-y divide-line/60">
          {visibles.map((n) => {
            const href = hrefDe(n);
            const contenido = (
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="text-lg leading-none mt-0.5">{ICONO_TIPO[n.tipo]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.leida ? "text-ink-muted" : "text-ink-base font-medium"}`}>
                    {n.mensaje}
                  </p>
                  <p className="text-xs text-ink-faint mt-0.5">{formatFechaHora(n.createdAt)}</p>
                </div>
                {!n.leida && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-urgent shrink-0" />
                )}
              </div>
            );

            return (
              <div
                key={n.id}
                className={`transition-colors ${!n.leida ? "bg-[#FAF1D8]/20" : ""} hover:bg-surface/50`}
                onClick={() => !n.leida && marcarLeida(n.id)}
              >
                {href ? <Link href={href}>{contenido}</Link> : contenido}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
