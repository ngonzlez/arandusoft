import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEstadoLicencia } from "@/lib/licencia";
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

  const noLeidas = await prisma.notificacion.count({
    where: { userId: id, leida: false },
  });

  return (
    <ToastProvider>
      <AppShell
        items={navParaRol(rol)}
        usuario={{ nombre: name ?? "Usuario", rol }}
        notificacionesNoLeidas={noLeidas}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
