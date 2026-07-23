import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEstadoLicencia, getConfigEstudio } from "@/lib/licencia";
import { getNotificacionesNoLeidasCached } from "@/lib/notificaciones-cache";
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

  // Cédulas CSJ sin revisar (badge del nav): consultamos siempre en paralelo con
  // las demás (no podemos condicionar por `config.features` sin esperar a
  // `getConfigEstudio` primero, y eso volvería a serializar los queries). Un
  // count() sobre esta tabla chica es despreciable.
  const [noLeidas, config, cedulasCsj] = await Promise.all([
    getNotificacionesNoLeidasCached(id),
    getConfigEstudio(),
    prisma.notificacionCsj.count({ where: { revisadoEnCsj: false } }),
  ]);

  return (
    <ToastProvider>
      <AppShell
        items={navParaRol(rol, config.features)}
        usuario={{ nombre: name ?? "Usuario", rol }}
        nombreEstudio={config.nombreEstudio}
        notificacionesNoLeidas={noLeidas}
        cedulasCsj={cedulasCsj}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
