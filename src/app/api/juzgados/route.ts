import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireApiSession();
  if (error) return error;

  const juzgados = await prisma.juzgado.findMany({
    orderBy: [{ circunscripcion: "asc" }, { nombre: "asc" }],
    include: {
      secretarias: { orderBy: { nombre: "asc" } },
    },
  });

  return NextResponse.json({ data: juzgados });
}

export async function POST(req: NextRequest) {
  const { error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const nombre = body?.nombre?.trim();
  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const juzgado = await prisma.juzgado.create({
    data: {
      nombre,
      circunscripcion: body.circunscripcion?.trim() || null,
      fuero: body.fuero?.trim() || null,
      juezActual: body.juezActual?.trim() || null,
      ubicacion: body.ubicacion?.trim() || null,
      telefono: body.telefono?.trim() || null,
    },
    include: { secretarias: true },
  });

  return NextResponse.json({ data: juzgado }, { status: 201 });
}
