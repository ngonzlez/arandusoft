import type { Rol } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // key de ICONS en Sidebar
  roles: Rol[];
  feature?: "juridico";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/clientes", label: "Clientes", icon: "users", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/estado-mensual", label: "Estado Mensual", icon: "check", roles: ["ADMIN", "CONTABLE"] },
  { href: "/calendario", label: "Vencimientos", icon: "calendar", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/asambleas", label: "Asambleas", icon: "flag", roles: ["ADMIN", "CONTABLE"] },
  { href: "/tareas", label: "Tareas", icon: "clipboard", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/expedientes", label: "Expedientes", icon: "folder", roles: ["ADMIN", "JURIDICO"], feature: "juridico" },
  { href: "/notificaciones", label: "Notificaciones", icon: "bell", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/reportes", label: "Reportes", icon: "chart", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/usuarios", label: "Equipo", icon: "briefcase", roles: ["ADMIN"] },
];

export function navParaRol(rol: Rol): NavItem[] {
  const juridicoActivo = process.env.NEXT_PUBLIC_ENABLE_JURIDICO === "true";
  return NAV_ITEMS.filter((item) => {
    if (item.feature === "juridico" && !juridicoActivo) return false;
    return item.roles.includes(rol);
  });
}
