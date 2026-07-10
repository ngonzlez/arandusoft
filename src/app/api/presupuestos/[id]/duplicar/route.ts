import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireApiSession,
  requireFeature,
  filtroPresupuestosPorRol,
} from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

// Duplicar: copia sin número/estado/firma/auditoría → BORRADOR (o plantilla).
// Cubre 3 flujos: duplicar, guardar-como-plantilla y crear-desde-plantilla.
export async function POST(req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("presupuestos");
  if (gate) return gate;
  const { id } = await params;

  const original = await prisma.presupuesto.findFirst({
    where: { id, ...filtroPresupuestosPorRol(user.rol) },
  });
  if (!original) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const comoPlantilla = !!body?.comoPlantilla;

  if (comoPlantilla && !body?.nombrePlantilla?.trim()) {
    return NextResponse.json(
      { error: "Las plantillas necesitan un nombre", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const copia = await prisma.presupuesto.create({
    data: {
      clienteId: original.clienteId,
      destNombre: original.destNombre,
      destRuc: original.destRuc,
      destDireccion: original.destDireccion,
      destTelefono: original.destTelefono,
      destEmail: original.destEmail,
      fechaEmision: new Date(),
      validezDias: original.validezDias,
      items: original.items as Prisma.InputJsonValue,
      descuento: original.descuento,
      subtotal: original.subtotal,
      total: original.total,
      notas: original.notas,
      datosBancarios: original.datosBancarios,
      firmante: original.firmante,
      esPlantilla: comoPlantilla,
      nombrePlantilla: comoPlantilla ? body.nombrePlantilla.trim() : null,
      creadoPor: user.id,
    },
  });

  return NextResponse.json({ data: copia }, { status: 201 });
}
