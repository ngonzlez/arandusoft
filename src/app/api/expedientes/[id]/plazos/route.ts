import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireFeature, filtroExpedientesPorRol } from "@/lib/api-auth";
import { contarDiasHabiles } from "@/lib/plazos";

// POST /api/expedientes/[id]/plazos
// Crea un plazo procesal (Vencimiento tipo PLAZO_PROCESAL) ligado al expediente.
// Con diasHabiles + fechaBase → calcula la fecha; o fechaVencimiento directa
// (Caducidad / Prescripción).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const { id } = await params;
  const exp = await prisma.expediente.findFirst({
    where: { id, ...filtroExpedientesPorRol(user.rol) },
    select: { id: true },
  });
  if (!exp) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const subtipoPlazo = (body?.subtipoPlazo ?? "Vencimiento").toString();
  const descripcion = body?.descripcion?.toString().trim() || null;
  const fechaBase = body?.fechaBase ? new Date(body.fechaBase) : null;
  const diasHabiles = body?.diasHabiles != null ? Number(body.diasHabiles) : null;

  let fechaVencimiento: Date;
  if (diasHabiles && fechaBase) {
    fechaVencimiento = contarDiasHabiles(fechaBase, diasHabiles, {
      excluirEnero: body?.excluirEnero ?? true,
      feriadosExcluidos: Array.isArray(body?.feriadosExcluidos) ? body.feriadosExcluidos : [],
    });
  } else if (body?.fechaVencimiento) {
    fechaVencimiento = new Date(body.fechaVencimiento);
  } else {
    return NextResponse.json(
      { error: "Falta diasHabiles+fechaBase o fechaVencimiento", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const plazo = await prisma.vencimiento.create({
    data: {
      tipo: "PLAZO_PROCESAL",
      subtipoPlazo,
      descripcion,
      expedienteId: exp.id,
      responsableId: user.id,
      fechaVencimiento,
      fechaBase,
      diasHabiles: diasHabiles ?? null,
    },
  });

  return NextResponse.json({ data: plazo }, { status: 201 });
}
