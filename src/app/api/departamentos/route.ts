import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

// Catálogo geográfico de referencia — lectura abierta a cualquier sesión,
// gestión (alta) restringida a ADMIN/JURIDICO (quienes cargan expedientes).
export async function GET() {
  const { error } = await requireApiSession();
  if (error) return error;

  const departamentos = await prisma.departamento.findMany({
    orderBy: { nombre: "asc" },
    include: { ciudades: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true } } },
  });

  return NextResponse.json({ data: departamentos });
}

export async function POST(req: NextRequest) {
  const { error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const nombre = body?.nombre?.trim();
  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const existente = await prisma.departamento.findUnique({ where: { nombre } });
  if (existente) {
    return NextResponse.json({ error: "Ya existe un departamento con ese nombre", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const departamento = await prisma.departamento.create({ data: { nombre } });
  return NextResponse.json({ data: departamento }, { status: 201 });
}
