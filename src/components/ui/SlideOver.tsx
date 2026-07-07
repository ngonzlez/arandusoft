"use client";

import { useEffect } from "react";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number; // 440 cliente / 480 expediente (prototipo)
  children: React.ReactNode;
}

export function SlideOver({ open, onClose, title, width = 440, children }: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-primary-dark/50"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="absolute right-0 top-0 h-full bg-white shadow-2xl flex flex-col animate-slide-in w-full"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="font-heading font-semibold text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink-base transition-colors"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </aside>
    </div>
  );
}
