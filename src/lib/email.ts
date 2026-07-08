import { Resend } from "resend";

let cliente: Resend | null = null;

export function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada");
  }
  if (!cliente) cliente = new Resend(process.env.RESEND_API_KEY);
  return cliente;
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "no-reply@criterioasesores.com.py";

// Plantilla HTML mínima con la identidad del sistema.
export function plantillaEmail(titulo: string, cuerpoHtml: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#F8F9FA;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1A2C4E;padding:20px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">Arandú<span style="color:#C9A84C;">Soft</span></span>
                <span style="color:#ffffff;opacity:.6;font-size:12px;"> · Criterio Asesores</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h2 style="margin:0 0 12px;color:#1A2C4E;font-size:18px;">${titulo}</h2>
                <div style="color:#2D2D2D;font-size:14px;line-height:1.6;">${cuerpoHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #E2E8F0;">
                <p style="margin:0;color:#94A3B8;font-size:11px;">
                  Mensaje automático del sistema de gestión interna. No responder a esta casilla salvo indicación.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
