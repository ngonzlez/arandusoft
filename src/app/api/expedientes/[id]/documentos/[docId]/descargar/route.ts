import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireFeature, filtroClientesPorRol } from "@/lib/api-auth";
import { urlFirmadaArchivo } from "@/lib/storage";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;
  const { id, docId } = await params;

  const documento = await prisma.documento.findFirst({
    where: { id: docId, expedienteId: id, expediente: { cliente: { ...filtroClientesPorRol(user.rol) } } },
    select: { publicId: true, url: true },
  });

  if (!documento) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (!documento.publicId) {
    return NextResponse.redirect(documento.url);
  }

  try {
    const url = await urlFirmadaArchivo(documento.publicId, "pdf", 600);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("Error generando URL firmada:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
