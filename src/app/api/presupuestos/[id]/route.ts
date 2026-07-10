import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireApiSession,
  requireFeature,
  filtroPresupuestosPorRol,
} from "@/lib/api-auth";
import { armarDataPresupuesto } from "@/lib/presupuestos";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const gate = await requireFeature("presupuestos");
  if (gate) return gate;
  const { id } = await params;

  const presupuesto = await prisma.presupuesto.findFirst({
    where: { id, ...filtroPresupuestosPorRol(user.rol) },
    include: {
      cliente: { select: { id: true, nombre: true } },
      creador: { select: { id: true, nombre: true } },
    },
  });

  if (!presupuesto) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: presupuesto });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("presupuestos");
  if (gate) return gate;
  const { id } = await params;

  const existente = await prisma.presupuesto.findFirst({
    where: { id, ...filtroPresupuestosPorRol(user.rol) },
  });
  if (!existente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Solo borradores y plantillas se editan — un EMITIDO es un documento entregado.
  if (existente.estado !== "BORRADOR" && !existente.esPlantilla) {
    return NextResponse.json(
      { error: "Solo se pueden editar borradores. Duplicalo para hacer una nueva versión.", code: "NO_EDITABLE" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let data;
  try {
    data = await armarDataPresupuesto(body, user.rol);
  } catch (e) {
    if (e instanceof Error && e.message === "CLIENTE_NO_VISIBLE") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Datos inválidos", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (data.destNombre === null) {
    return NextResponse.json(
      { error: "El destinatario no puede quedar vacío", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (existente.esPlantilla && body.nombrePlantilla !== undefined) {
    if (!body.nombrePlantilla?.trim()) {
      return NextResponse.json(
        { error: "Las plantillas necesitan un nombre", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    data.nombrePlantilla = body.nombrePlantilla.trim();
  }

  const presupuesto = await prisma.presupuesto.update({
    where: { id },
    data: { ...(data as object), actualizadoPor: user.id },
  });

  return NextResponse.json({ data: presupuesto });
}
