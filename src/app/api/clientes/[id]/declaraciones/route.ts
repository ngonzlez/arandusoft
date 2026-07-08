import { NextRequest, NextResponse } from "next/server";
import { subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";

// Declaraciones del cliente, separadas en recientes e historial (>6 meses).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const { id } = await params;

  const cliente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientesPorRol(user.rol) },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const declaraciones = await prisma.declaracion.findMany({
    where: { clienteId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tipo: true,
      periodo: true,
      fechaPresentacion: true,
      archivoNombreOriginal: true,
      archivoFormato: true,
      tamanioBytes: true,
      createdAt: true,
      cargador: { select: { nombre: true } },
    },
  });

  const corte = subMonths(new Date(), 6);
  const recientes = declaraciones.filter((d) => d.createdAt >= corte);
  const historial = declaraciones.filter((d) => d.createdAt < corte);

  return NextResponse.json({ data: { recientes, historial } });
}
