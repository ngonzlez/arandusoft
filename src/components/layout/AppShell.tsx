"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { ICONS } from "@/components/layout/Icons";
import type { NavItem } from "@/components/layout/nav";

interface AppShellProps {
  items: NavItem[];
  usuario: { nombre: string; rol: string };
  nombreEstudio: string;
  notificacionesNoLeidas?: number;
  children: React.ReactNode;
}

export function AppShell({ items, usuario, nombreEstudio, notificacionesNoLeidas, children }: AppShellProps) {
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar fijo desktop (>=920px) */}
      <div className="hidden lg:block shrink-0">
        <Sidebar
          items={items}
          usuario={usuario}
          nombreEstudio={nombreEstudio}
          notificacionesNoLeidas={notificacionesNoLeidas}
        />
      </div>

      {/* Drawer mobile */}
      {drawerAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-primary-dark/50"
            onClick={() => setDrawerAbierto(false)}
          />
          <div className="absolute left-0 top-0 h-full animate-slide-in-left">
            <Sidebar
              items={items}
              usuario={usuario}
              nombreEstudio={nombreEstudio}
              notificacionesNoLeidas={notificacionesNoLeidas}
              onNavigate={() => setDrawerAbierto(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-[68px] shrink-0 bg-white border-b border-line flex items-center gap-4 px-4 lg:px-8">
          <button
            className="lg:hidden text-ink-muted"
            onClick={() => setDrawerAbierto(true)}
            aria-label="Abrir menú"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex-1" />
          <Link
            href="/notificaciones"
            className="relative text-ink-muted hover:text-primary transition-colors"
            title="Notificaciones"
          >
            {ICONS.bell}
            {(notificacionesNoLeidas ?? 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full bg-urgent px-1 text-[10px] font-semibold leading-4 text-white text-center">
                {notificacionesNoLeidas}
              </span>
            )}
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
