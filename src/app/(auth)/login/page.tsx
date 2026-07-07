import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingresar — ArandúSoft" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.rol === "SUPERADMIN" ? "/admin/licencia" : "/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — marca (oculto en mobile) */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#1A2C4E 0%,#12203A 100%)" }}
      >
        {/* Círculos decorativos del prototipo */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5" />
        <div className="absolute top-32 -left-16 h-48 w-48 rounded-full bg-gold/10" />
        <div className="absolute -bottom-20 right-16 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <Image
            src="/brand/logo.png"
            alt="ArandúSoft"
            width={44}
            height={44}
            className="rounded-xl bg-white/95 p-1"
          />
          <p className="font-heading text-xl font-bold text-white">
            Arandú<span className="text-gold">Soft</span>
          </p>
        </div>

        <div className="relative">
          <h1 className="font-heading text-3xl font-bold text-white leading-snug">
            Sistema de Gestión Interna
          </h1>
          <p className="mt-3 text-white/70 max-w-md">
            Clientes, vencimientos, declaraciones y tareas del estudio
            jurídico-contable, en un solo lugar.
          </p>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Criterio Asesores S.R.L
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image
              src="/brand/logo.png"
              alt="ArandúSoft"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <p className="font-heading text-lg font-bold text-primary">
              Arandú<span className="text-gold">Soft</span>
            </p>
          </div>

          <h2 className="font-heading text-2xl font-bold text-primary">Bienvenido</h2>
          <p className="text-sm text-ink-muted mt-1 mb-8">
            Ingresá con tu cuenta del estudio
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
