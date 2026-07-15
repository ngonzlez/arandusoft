import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

// Solo permite renombrar — es catálogo geográfico estable, sin baja.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const nombre = body?.nombre?.trim();
  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const departamento = await prisma.departamento.update({ where: { id }, data: { nombre } }).catch(() => null);
  if (!departamento) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: departamento });
}
