import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

// Perfil del estudio (identidad del emisor de documentos). Lo lee cualquier
// usuario con sesión (el editor de presupuestos lo necesita), lo edita solo ADMIN.
export async function GET() {
  const { error } = await requireApiSession();
  if (error) return error;

  const perfil = await prisma.perfilEstudio.findFirst();
  return NextResponse.json({ data: perfil });
}

const CAMPOS = ["razonSocial", "ruc", "telefono", "email", "direccion", "ciudad"] as const;

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return NextResponse.json({ error: "Email inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const data: Record<string, string | null> = { actualizadoPor: user.id };
  for (const campo of CAMPOS) {
    if (body[campo] !== undefined) data[campo] = body[campo]?.trim() || null;
  }

  const existente = await prisma.perfilEstudio.findFirst();
  const perfil = existente
    ? await prisma.perfilEstudio.update({ where: { id: existente.id }, data })
    : await prisma.perfilEstudio.create({ data });

  return NextResponse.json({ data: perfil });
}
