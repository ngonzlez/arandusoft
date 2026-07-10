import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEstadoLicencia, getConfigEstudio } from "@/lib/licencia";
import { prisma } from "@/lib/prisma";
import { navParaRol } from "@/components/layout/nav";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { rol, id, name } = session.user;

  if (rol === "SUPERADMIN") redirect("/admin/licencia");

  // Regla dura del PRD: licencia se verifica antes que cualquier otra cosa.
  const { activa } = await getEstadoLicencia();
  if (!activa) redirect("/suspendido");

  const [noLeidas, config] = await Promise.all([
    prisma.notificacion.count({ where: { userId: id, leida: false } }),
    getConfigEstudio(),
  ]);

  return (
    <ToastProvider>
      <AppShell
        items={navParaRol(rol, config.features)}
        usuario={{ nombre: name ?? "Usuario", rol }}
        nombreEstudio={config.nombreEstudio}
        notificacionesNoLeidas={noLeidas}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
