"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { ICONS } from "@/components/layout/Icons";
import type { NavItem } from "@/components/layout/nav";

interface SidebarProps {
  items: NavItem[];
  usuario: { nombre: string; rol: string };
  nombreEstudio: string;
  notificacionesNoLeidas?: number;
  cedulasCsj?: number;
  onNavigate?: () => void; // cierra drawer en mobile
}

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  CONTABLE: "Contable",
  JURIDICO: "Jurídico",
  SUPERADMIN: "Superadmin",
};

export function Sidebar({ items, usuario, nombreEstudio, notificacionesNoLeidas = 0, cedulasCsj = 0, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-60 flex-col bg-primary text-white">
      <div className="flex items-center gap-3 px-5 pt-[22px] pb-5">
        <Image
          src="/brand/logo.png"
          alt="ArandúSoft"
          width={38}
          height={38}
          className="rounded-[10px] bg-white/95 p-0.5 shrink-0"
        />
        <div className="min-w-0">
          <p className="font-heading font-semibold text-[15px] leading-tight text-white">
            Arandú<span className="text-gold">Soft</span>
          </p>
          <p className="text-[10px] text-gold/90 tracking-wide mt-0.5 truncate">
            GESTIÓN INTERNA · {nombreEstudio.toUpperCase()}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {items.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] mb-[3px] transition-colors"
              style={{
                fontWeight: activo ? 600 : 500,
                background: activo ? "#C9A84C" : "transparent",
                color: activo ? "#15243C" : "rgba(226,232,240,.72)",
              }}
            >
              <span className="flex items-center">{ICONS[item.icon]}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/notificaciones" && notificacionesNoLeidas > 0 && (
                <span className="rounded-full bg-urgent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {notificacionesNoLeidas}
                </span>
              )}
              {item.href === "/notificaciones-csj" && cedulasCsj > 0 && (
                <span className="rounded-full bg-urgent px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {cedulasCsj}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[.08] p-3">
        <div className="flex items-center gap-[11px] px-2 py-1.5">
          <Avatar nombre={usuario.nombre} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate text-white">{usuario.nombre}</p>
            <p className="text-[11px] text-white/55">{ROL_LABEL[usuario.rol] ?? usuario.rol}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-white/60 hover:text-white transition-colors p-1.5"
            title="Cerrar sesión"
          >
            {ICONS.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
