import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEstadoLicencia } from "@/lib/licencia";

// Layout minimal para vistas imprimibles: sin sidebar ni topbar.
// Replica los checks del layout dashboard (no los hereda).
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.rol !== "SUPERADMIN") {
    const { activa } = await getEstadoLicencia();
    if (!activa) redirect("/suspendido");
  }

  return <div className="min-h-screen bg-surface print:bg-white">{children}</div>;
}
