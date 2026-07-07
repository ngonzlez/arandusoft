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
  notificacionesNoLeidas?: number;
  onNavigate?: () => void; // cierra drawer en mobile
}

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  CONTABLE: "Contable",
  JURIDICO: "Jurídico",
  SUPERADMIN: "Superadmin",
};

export function Sidebar({ items, usuario, notificacionesNoLeidas = 0, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className="flex h-full w-64 flex-col text-white"
      style={{ background: "linear-gradient(180deg,#192C4C 0%,#14233D 100%)" }}
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <Image
          src="/brand/logo.png"
          alt="ArandúSoft"
          width={36}
          height={36}
          className="rounded-lg bg-white/95 p-0.5"
        />
        <div>
          <p className="font-heading font-bold leading-tight">
            Arandú<span className="text-gold">Soft</span>
          </p>
          <p className="text-[11px] text-white/60 leading-tight">Criterio Asesores</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const activo = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors ${
                activo
                  ? "bg-gold text-white font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {ICONS[item.icon]}
              <span className="flex-1">{item.label}</span>
              {item.icon === "bell" && notificacionesNoLeidas > 0 && (
                <span className="rounded-full bg-urgent px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {notificacionesNoLeidas}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar nombre={usuario.nombre} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{usuario.nombre}</p>
            <p className="text-[11px] text-white/60">{ROL_LABEL[usuario.rol] ?? usuario.rol}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-white/60 hover:text-white transition-colors"
            title="Cerrar sesión"
          >
            {ICONS.logout}
          </button>
        </div>
      </div>
    </div>
  );
}
