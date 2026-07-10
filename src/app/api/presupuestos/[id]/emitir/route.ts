import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireApiSession,
  requireFeature,
  filtroPresupuestosPorRol,
} from "@/lib/api-auth";
import { emitirPresupuesto, validarItems } from "@/lib/presupuestos";

type Params = { params: Promise<{ id: string }> };

// Emitir: asigna número correlativo (o manual) y congela el documento.
export async function POST(req: NextRequest, { params }: Params) {
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

  if (existente.esPlantilla) {
    return NextResponse.json(
      { error: "Las plantillas no se emiten — creá un presupuesto desde ella", code: "NO_EDITABLE" },
      { status: 409 }
    );
  }
  if (existente.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: "Solo se emiten borradores", code: "NO_EDITABLE" },
      { status: 409 }
    );
  }

  const items = validarItems(existente.items);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "El presupuesto necesita al menos un ítem", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  let numeroManual: number | undefined;
  if (body?.numero !== undefined && body.numero !== null && body.numero !== "") {
    const n = Number(body.numero);
    if (!Number.isInteger(n) || n < 1 || n > 999999) {
      return NextResponse.json({ error: "Número inválido", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    numeroManual = n;
  }

  try {
    const presupuesto = await emitirPresupuesto(id, user.id, numeroManual);
    return NextResponse.json({ data: presupuesto });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: `El número ${numeroManual} ya existe este año`, code: "NUMERO_DUPLICADO" },
        { status: 409 }
      );
    }
    console.error("Error emitiendo presupuesto:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
