import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const { id } = await params;

  const juzgado = await prisma.juzgado.findUnique({ where: { id } });
  if (!juzgado) {
    return NextResponse.json({ error: "Juzgado no encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const nombre = body?.nombre?.trim();
  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const existente = await prisma.secretaria.findUnique({
    where: { juzgadoId_nombre: { juzgadoId: id, nombre } },
  });
  if (existente) {
    return NextResponse.json({ error: "Ya existe esa secretaría en el juzgado", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const secretaria = await prisma.secretaria.create({
    data: {
      nombre,
      juzgadoId: id,
      actuario: body.actuario?.trim() || null,
      telefono: body.telefono?.trim() || null,
    },
  });

  return NextResponse.json({ data: secretaria }, { status: 201 });
}
