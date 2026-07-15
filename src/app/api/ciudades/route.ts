import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireApiSession();
  if (error) return error;

  const departamentoId = req.nextUrl.searchParams.get("departamentoId");

  const ciudades = await prisma.ciudad.findMany({
    where: { ...(departamentoId ? { departamentoId } : {}) },
    orderBy: { nombre: "asc" },
    include: { departamento: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json({ data: ciudades });
}

export async function POST(req: NextRequest) {
  const { error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const nombre = body?.nombre?.trim();
  const departamentoId = body?.departamentoId;

  if (!nombre || !departamentoId) {
    return NextResponse.json(
      { error: "Nombre y departamento son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const departamento = await prisma.departamento.findUnique({ where: { id: departamentoId } });
  if (!departamento) {
    return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 });
  }

  const existente = await prisma.ciudad.findUnique({
    where: { departamentoId_nombre: { departamentoId, nombre } },
  });
  if (existente) {
    return NextResponse.json(
      { error: "Ya existe esa ciudad en el departamento elegido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const ciudad = await prisma.ciudad.create({ data: { nombre, departamentoId } });
  return NextResponse.json({ data: ciudad }, { status: 201 });
}
