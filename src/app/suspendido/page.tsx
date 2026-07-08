import Image from "next/image";
import { redirect } from "next/navigation";
import { getEstadoLicencia } from "@/lib/licencia";

export const metadata = { title: "Acceso suspendido — ArandúSoft" };
export const dynamic = "force-dynamic";

export default async function SuspendidoPage() {
  const { activa, mensaje } = await getEstadoLicencia();
  if (activa) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white rounded-card border border-line p-8 text-center">
        <Image
          src="/brand/logo.png"
          alt="ArandúSoft"
          width={56}
          height={56}
          className="mx-auto rounded-xl"
        />
        <h1 className="font-heading text-xl font-bold text-primary mt-6">
          Acceso temporalmente suspendido
        </h1>
        <p className="text-sm text-ink-muted mt-3">
          El acceso al sistema se encuentra suspendido. Sus datos están
          protegidos y no se pierden — el acceso se restablece de inmediato al
          regularizar la situación.
        </p>

        {mensaje && (
          <p className="mt-4 rounded-control bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
            {mensaje}
          </p>
        )}

        <p className="text-xs text-ink-faint mt-6">
          Ante cualquier consulta, contactá al proveedor del sistema.
        </p>
      </div>
    </div>
  );
}
