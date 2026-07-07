"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastTipo = "exito" | "error" | "info" | "advertencia";

interface ToastItem {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
}

const ESTILOS: Record<ToastTipo, { bg: string; border: string; text: string }> = {
  exito: { bg: "#E7F2EC", border: "#3A9E6B", text: "#2C6E4C" },
  error: { bg: "#FBE9EC", border: "#C0344B", text: "#C0344B" },
  advertencia: { bg: "#FAF1D8", border: "#9A7416", text: "#9A7416" },
  info: { bg: "#E7EDF7", border: "#2F6FB0", text: "#2F6FB0" },
};

const ToastContext = createContext<(tipo: ToastTipo, mensaje: string) => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((tipo: ToastTipo, mensaje: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const s = ESTILOS[t.tipo];
          return (
            <div
              key={t.id}
              className="rounded-control px-4 py-3 text-sm shadow-lg border-l-4"
              style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
            >
              {t.mensaje}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
