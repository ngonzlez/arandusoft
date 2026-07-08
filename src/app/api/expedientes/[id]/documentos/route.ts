import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireModuloJuridico, filtroClientesPorRol } from "@/lib/api-auth";
import { subirArchivo, type FormatoArchivo } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 15 * 1024 * 1024; // 15MB

const MIME_A_FORMATO: Record<string, FormatoArchivo> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "jpg",
  "image/png": "png",
};

async function expedienteVisible(id: string, rol: Parameters<typeof filtroClientesPorRol>[0]) {
  return prisma.expediente.findFirst({
    where: { id, cliente: { ...filtroClientesPorRol(rol) } },
    select: { id: true, clienteId: true },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const gate = await requireModuloJuridico();
  if (gate) return gate;
  const { id } = await params;

  if (!(await expedienteVisible(id, user.rol))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const documentos = await prisma.documento.findMany({
    where: { expedienteId: id },
    orderBy: { createdAt: "desc" },
    include: { subidor: { select: { nombre: true } } },
  });

  return NextResponse.json({ data: documentos });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const gate = await requireModuloJuridico();
  if (gate) return gate;
  const { id } = await params;

  const expediente = await expedienteVisible(id, user.rol);
  if (!expediente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Se esperaba multipart/form-data", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const archivo = form.get("archivo");
  const nombre = form.get("nombre")?.toString()?.trim();

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "El archivo es obligatorio", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const formato = MIME_A_FORMATO[archivo.type];
  if (!formato) {
    return NextResponse.json(
      { error: "Formato no soportado (PDF, Word, Excel o imagen)", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera el tamaño máximo de 15 MB", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());

  let subida;
  try {
    subida = await subirArchivo(buffer, `expedientes/${expediente.id}`, "documento", formato);
  } catch (e) {
    console.error("Error subiendo documento:", e);
    return NextResponse.json(
      { error: "No se pudo subir el archivo. Verificá la configuración de almacenamiento." },
      { status: 500 }
    );
  }

  const documento = await prisma.documento.create({
    data: {
      expedienteId: id,
      nombre: nombre || archivo.name,
      url: subida.url,
      publicId: subida.publicId,
      subidoPor: user.id,
    },
    include: { subidor: { select: { nombre: true } } },
  });

  return NextResponse.json({ data: documento }, { status: 201 });
}
