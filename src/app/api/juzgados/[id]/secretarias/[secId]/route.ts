import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string; secId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const { id, secId } = await params;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const data: Prisma.SecretariaUpdateInput = {
    ...(body.nombre !== undefined ? { nombre: body.nombre.trim() } : {}),
    ...(body.actuario !== undefined ? { actuario: body.actuario?.trim() || null } : {}),
    ...(body.telefono !== undefined ? { telefono: body.telefono?.trim() || null } : {}),
    ...(body.activo !== undefined ? { activo: !!body.activo } : {}),
  };

  const secretaria = await prisma.secretaria
    .update({ where: { id: secId, juzgadoId: id }, data })
    .catch(() => null);
  if (!secretaria) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: secretaria });
}
