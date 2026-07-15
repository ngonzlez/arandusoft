"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

// Boundary de error global: sin esto, cualquier excepción de render (incluida
// "Failed to find Server Action" — pasa después de cada deploy si el
// navegador quedó con una pestaña vieja abierta) muestra el error técnico
// crudo en pantalla blanca. Regla dura del proyecto: nunca error técnico
// crudo al usuario.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const esVersionDesactualizada =
    /Server Action|ChunkLoadError|Loading chunk|older or newer deployment/i.test(error.message);

  useEffect(() => {
    console.error(error);
  }, [error]);

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

        {esVersionDesactualizada ? (
          <>
            <h1 className="font-heading text-xl font-bold text-primary mt-6">
              El sistema se actualizó
            </h1>
            <p className="text-sm text-ink-muted mt-3">
              Esta pestaña quedó abierta con una versión anterior. Recargá la
              página para seguir trabajando con la versión actual.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-heading text-xl font-bold text-primary mt-6">
              Ocurrió un error
            </h1>
            <p className="text-sm text-ink-muted mt-3">
              Algo no funcionó como esperábamos. Tus datos están a salvo —
              probá recargar la página. Si el problema sigue, contactá al
              proveedor del sistema.
            </p>
          </>
        )}

        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
            Ir al inicio
          </Button>
          <Button
            onClick={() => {
              if (esVersionDesactualizada) {
                window.location.reload();
              } else {
                reset();
              }
            }}
          >
            Recargar
          </Button>
        </div>
      </div>
    </div>
  );
}
