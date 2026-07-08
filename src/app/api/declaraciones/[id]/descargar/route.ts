import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";
import { urlFirmadaPdf } from "@/lib/storage";

// Descarga con 1 clic: valida visibilidad por rol y redirige a URL firmada corta.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const { id } = await params;

  const declaracion = await prisma.declaracion.findFirst({
    where: { id, cliente: { ...filtroClientesPorRol(user.rol) } },
    select: { archivoPublicId: true, archivoUrl: true },
  });

  if (!declaracion) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (!declaracion.archivoPublicId) {
    // Registros importados sin publicId: caer a la URL guardada
    return NextResponse.redirect(declaracion.archivoUrl);
  }

  try {
    return NextResponse.redirect(urlFirmadaPdf(declaracion.archivoPublicId, 600));
  } catch (e) {
    console.error("Error generando URL firmada:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
