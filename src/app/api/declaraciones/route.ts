import { NextRequest, NextResponse } from "next/server";
import { TipoObligacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";
import { subirArchivoDeclaracion, type FormatoArchivo } from "@/lib/storage";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB

const MIME_A_FORMATO: Record<string, FormatoArchivo> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

// Subir declaración: PDF o el Excel de IVA que el cliente presenta en Marangatu
// (multipart/form-data: archivo, clienteId, tipo, periodo).
// Si viene `vincularEstadoMensual=true`, además tilda esa obligación del período.
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE"]);
  if (error) return error;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Se esperaba multipart/form-data", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const archivo = form.get("archivo");
  const clienteId = form.get("clienteId")?.toString();
  const tipo = form.get("tipo")?.toString() as TipoObligacion;
  const periodo = form.get("periodo")?.toString()?.trim();
  const vincular = form.get("vincularEstadoMensual")?.toString() === "true";

  if (!(archivo instanceof File) || !clienteId || !periodo || !Object.values(TipoObligacion).includes(tipo)) {
    return NextResponse.json(
      { error: "Archivo, cliente, tipo y período son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const formato = MIME_A_FORMATO[archivo.type];
  if (!formato) {
    return NextResponse.json(
      { error: "Solo se aceptan archivos PDF o Excel (.xlsx)", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (archivo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el tamaño máximo de 15 MB", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, ...filtroClientesPorRol(user.rol) },
    select: { id: true, ruc: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());

  let subida;
  try {
    subida = await subirArchivoDeclaracion(
      buffer,
      `declaraciones/${cliente.ruc}`,
      `${tipo}-${periodo}`,
      formato
    );
  } catch (e) {
    console.error("Error subiendo a Cloudinary:", e);
    return NextResponse.json(
      { error: "No se pudo subir el archivo. Verificá la configuración de almacenamiento." },
      { status: 500 }
    );
  }

  const declaracion = await prisma.declaracion.create({
    data: {
      clienteId,
      tipo,
      periodo,
      fechaPresentacion: new Date(),
      archivoUrl: subida.url,
      archivoPublicId: subida.publicId,
      archivoNombreOriginal: archivo.name,
      archivoFormato: formato,
      tamanioBytes: subida.bytes,
      cargadoPor: user.id,
    },
  });

  // Vincular al checklist mensual si el período tiene formato AAAA-MM
  if (vincular && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    await prisma.estadoMensual.upsert({
      where: { clienteId_mes_obligacion: { clienteId, mes: periodo, obligacion: tipo } },
      create: {
        clienteId,
        mes: periodo,
        obligacion: tipo,
        estado: "PRESENTADO",
        fechaPresentacion: new Date(),
        responsableId: user.id,
        declaracionId: declaracion.id,
      },
      update: {
        estado: "PRESENTADO",
        fechaPresentacion: new Date(),
        responsableId: user.id,
        declaracionId: declaracion.id,
      },
    });
  }

  return NextResponse.json({ data: { id: declaracion.id } }, { status: 201 });
}
