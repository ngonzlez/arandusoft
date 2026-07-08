import { NextRequest, NextResponse } from "next/server";
import { EstadoVencimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { filtroVencimientosPorRol } from "@/lib/vencimientos";

// Cambiar estado (PENDIENTE / GESTIONADO / VENCIDO).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const estado = body?.estado as EstadoVencimiento;

  if (!Object.values(EstadoVencimiento).includes(estado)) {
    return NextResponse.json(
      { error: "Estado inválido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const existente = await prisma.vencimiento.findFirst({
    where: { id, ...filtroVencimientosPorRol(user.rol) },
    select: { id: true },
  });
  if (!existente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const actualizado = await prisma.vencimiento.update({
    where: { id },
    data: { estado, responsableId: user.id },
  });

  return NextResponse.json({ data: actualizado });
}
