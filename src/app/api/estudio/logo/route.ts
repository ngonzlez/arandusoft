import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { subirArchivo, descargarArchivo, type FormatoArchivo } from "@/lib/storage";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

const MIME_A_FORMATO: Record<string, FormatoArchivo> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

const CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
};

// Logo del estudio. GET streamea desde MinIO por sesión (NO URL firmada:
// expiraría en la vista de impresión que puede quedar abierta horas).
export async function GET() {
  const { error } = await requireApiSession();
  if (error) return error;

  const perfil = await prisma.perfilEstudio.findFirst({
    select: { logoPublicId: true, logoFormato: true },
  });
  if (!perfil?.logoPublicId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    const formato = (perfil.logoFormato ?? "png") as FormatoArchivo;
    const buffer = await descargarArchivo(perfil.logoPublicId, formato);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": CONTENT_TYPE[formato] ?? "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("Error descargando logo:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN"]);
  if (error) return error;

  const form = await req.formData().catch(() => null);
  const archivo = form?.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "El archivo es obligatorio", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const formato = MIME_A_FORMATO[archivo.type];
  if (!formato) {
    return NextResponse.json({ error: "Solo PNG o JPG", code: "VALIDATION_ERROR" }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El logo supera 2 MB", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());

  let subida;
  try {
    subida = await subirArchivo(buffer, "estudio", "logo", formato);
  } catch (e) {
    console.error("Error subiendo logo:", e);
    return NextResponse.json(
      { error: "No se pudo subir el logo. Verificá la configuración de almacenamiento." },
      { status: 500 }
    );
  }

  const existente = await prisma.perfilEstudio.findFirst();
  const data = { logoPublicId: subida.publicId, logoFormato: formato, actualizadoPor: user.id };
  const perfil = existente
    ? await prisma.perfilEstudio.update({ where: { id: existente.id }, data })
    : await prisma.perfilEstudio.create({ data });

  return NextResponse.json({ data: perfil }, { status: 201 });
}

export async function DELETE() {
  const { user, error } = await requireApiSession(["ADMIN"]);
  if (error) return error;

  const existente = await prisma.perfilEstudio.findFirst();
  if (!existente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Solo se desvincula — el objeto queda en MinIO (consistente con soft delete).
  const perfil = await prisma.perfilEstudio.update({
    where: { id: existente.id },
    data: { logoPublicId: null, logoFormato: null, actualizadoPor: user.id },
  });

  return NextResponse.json({ data: perfil });
}
