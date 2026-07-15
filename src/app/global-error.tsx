"use client";

// Boundary de último recurso: solo se activa si el layout raíz mismo falla
// (muy raro). Reemplaza <html>/<body> por completo, por eso va autocontenido
// sin depender de fuentes/estilos del layout.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F8F9FA" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
            }}
          >
            <h1 style={{ color: "#1A2C4E", fontSize: 20, fontWeight: 700, margin: 0 }}>
              ArandúSoft no pudo cargar
            </h1>
            <p style={{ color: "#64748B", fontSize: 14, marginTop: 12 }}>
              Ocurrió un error inesperado. Probá recargar la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 20,
                background: "#1A2C4E",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
