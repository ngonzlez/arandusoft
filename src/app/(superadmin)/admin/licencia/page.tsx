import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ToastProvider } from "@/components/ui/Toast";
import { LicenciaPanel } from "@/components/admin/LicenciaPanel";

export const metadata = { title: "Panel de licencia — ArandúSoft" };
export const dynamic = "force-dynamic";

export default async function AdminLicenciaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "SUPERADMIN") redirect("/dashboard");

  const licencia = await prisma.licencia.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      pagos: {
        orderBy: { fechaPago: "desc" },
        include: { registrador: { select: { nombre: true } } },
      },
    },
  });

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface">
        <header className="bg-primary text-white">
          <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/logo.png"
                alt="ArandúSoft"
                width={36}
                height={36}
                className="rounded-lg bg-white/95 p-0.5"
              />
              <div>
                <p className="font-heading font-bold leading-tight">
                  Arandú<span className="text-gold">Soft</span> — Panel del proveedor
                </p>
                <p className="text-[11px] text-white/60">
                  Control de licencia · Criterio Asesores S.R.L
                </p>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-sm text-white/70 hover:text-white transition-colors">
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          <LicenciaPanel
            licencia={licencia ? JSON.parse(JSON.stringify(licencia)) : null}
          />
        </main>
      </div>
    </ToastProvider>
  );
}
