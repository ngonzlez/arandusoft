"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (res?.error) {
      setError("Correo o contraseña incorrectos");
      setCargando(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Correo electrónico"
        name="email"
        type="email"
        placeholder="tu@correo.com"
        autoComplete="email"
        required
      />
      <Input
        label="Contraseña"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />

      {error && (
        <p className="rounded-control bg-[#FEE2E2] px-3 py-2 text-sm text-urgent">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={cargando}>
        {cargando ? <Spinner className="text-white" /> : "Ingresar"}
      </Button>
    </form>
  );
}
