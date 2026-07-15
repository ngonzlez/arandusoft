import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const data: Prisma.JuzgadoUpdateInput = {
    ...(body.nombre !== undefined ? { nombre: body.nombre.trim() } : {}),
    ...(body.circunscripcion !== undefined ? { circunscripcion: body.circunscripcion?.trim() || null } : {}),
    ...(body.fuero !== undefined ? { fuero: body.fuero?.trim() || null } : {}),
    ...(body.juezActual !== undefined ? { juezActual: body.juezActual?.trim() || null } : {}),
    ...(body.ubicacion !== undefined ? { ubicacion: body.ubicacion?.trim() || null } : {}),
    ...(body.telefono !== undefined ? { telefono: body.telefono?.trim() || null } : {}),
    ...(body.activo !== undefined ? { activo: !!body.activo } : {}),
  };

  const juzgado = await prisma.juzgado
    .update({ where: { id }, data, include: { secretarias: true } })
    .catch(() => null);
  if (!juzgado) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: juzgado });
}
