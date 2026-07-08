import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroTareasPorRol } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

async function tareaVisible(id: string, rol: Parameters<typeof filtroTareasPorRol>[0]) {
  return prisma.tarea.findFirst({
    where: { id, ...filtroTareasPorRol(rol) },
    select: { id: true },
  });
}

// Historial de observaciones de una tarea — append-only (nunca se editan/borran).
export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const { id } = await params;

  if (!(await tareaVisible(id, user.rol))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const notas = await prisma.nota.findMany({
    where: { tareaId: id },
    orderBy: { createdAt: "asc" },
    include: { autor: { select: { nombre: true } } },
  });

  return NextResponse.json({ data: notas });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const { id } = await params;

  if (!(await tareaVisible(id, user.rol))) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const contenido = body?.contenido?.trim();

  if (!contenido) {
    return NextResponse.json(
      { error: "La observación no puede estar vacía", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const nota = await prisma.nota.create({
    data: { contenido, autorId: user.id, tareaId: id },
    include: { autor: { select: { nombre: true } } },
  });

  return NextResponse.json({ data: nota }, { status: 201 });
}
