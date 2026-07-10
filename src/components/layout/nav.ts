import type { Rol } from "@prisma/client";
import type { Feature } from "@/lib/features";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // key de ICONS en Sidebar
  roles: Rol[];
  feature?: Feature;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/clientes", label: "Clientes", icon: "users", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/estado-mensual", label: "Estado Mensual", icon: "check", roles: ["ADMIN", "CONTABLE"] },
  { href: "/calendario", label: "Vencimientos", icon: "calendar", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/asambleas", label: "Asambleas", icon: "flag", roles: ["ADMIN", "CONTABLE"] },
  { href: "/tareas", label: "Tareas", icon: "clipboard", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/expedientes", label: "Expedientes", icon: "folder", roles: ["ADMIN", "JURIDICO"], feature: "juridico" },
  { href: "/presupuestos", label: "Presupuestos", icon: "receipt", roles: ["ADMIN", "CONTABLE", "JURIDICO"], feature: "presupuestos" },
  { href: "/notificaciones", label: "Notificaciones", icon: "bell", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/reportes", label: "Reportes", icon: "chart", roles: ["ADMIN", "CONTABLE", "JURIDICO"] },
  { href: "/usuarios", label: "Equipo", icon: "briefcase", roles: ["ADMIN"] },
  { href: "/configuracion", label: "Configuración", icon: "settings", roles: ["ADMIN"] },
];

// features viene de Licencia.features (DB, editable desde el panel superadmin).
export function navParaRol(rol: Rol, features: string[]): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.feature && !features.includes(item.feature)) return false;
    return item.roles.includes(rol);
  });
}
