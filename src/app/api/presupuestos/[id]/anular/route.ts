import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireApiSession,
  requireFeature,
  filtroPresupuestosPorRol,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

// Anular: soft delete — conserva el número (como una factura anulada).
export async function POST(_req: NextRequest, { params }: Params) {
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
  if (existente.estado === "ANULADO") {
    return NextResponse.json({ error: "Ya está anulado", code: "NO_EDITABLE" }, { status: 409 });
  }

  const presupuesto = await prisma.presupuesto.update({
    where: { id },
    data: { estado: "ANULADO", anuladoEl: new Date(), anuladoPor: user.id },
  });

  return NextResponse.json({ data: presupuesto });
}
