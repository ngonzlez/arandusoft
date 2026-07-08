import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";
import { enviarDeclaracionPorCorreo } from "@/lib/email-archivos";

// Enviar un archivo de un cliente por correo a otro usuario interno.
// Fase 1 contable: solo declaraciones. Documentos de expedientes → Fase 2.
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { tipo, archivoId, destinatarioId, mensaje } = body ?? {};

  if (tipo !== "declaracion" || !archivoId || !destinatarioId) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (destinatarioId === user.id) {
    return NextResponse.json(
      { error: "No podés enviarte un archivo a vos mismo", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // El remitente debe tener visibilidad sobre el cliente dueño del archivo
  const declaracion = await prisma.declaracion.findFirst({
    where: { id: archivoId, cliente: { ...filtroClientesPorRol(user.rol) } },
    select: { id: true },
  });
  if (!declaracion) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const remitente = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, nombre: true, email: true },
  });
  if (!remitente) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultado = await enviarDeclaracionPorCorreo({
    declaracionId: archivoId,
    remitente,
    destinatarioId,
    mensaje,
  });

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.error ?? "No se pudo enviar el correo" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { enviado: true } });
}
