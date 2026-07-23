import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireFeature, filtroExpedientesPorRol } from "@/lib/api-auth";

// Reportes compartibles (link con token) del estado de un expediente.

async function expedienteVisible(id: string, rol: Parameters<typeof filtroExpedientesPorRol>[0]) {
  return prisma.expediente.findFirst({
    where: { id, ...filtroExpedientesPorRol(rol) },
    select: { id: true },
  });
}

// GET → lista los reportes del expediente
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;
  const { id } = await params;
  if (!(await expedienteVisible(id, user.rol)))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const reportes = await prisma.reporteExpediente.findMany({
    where: { expedienteId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, activo: true, expiraEl: true, incluyeActuaciones: true, createdAt: true },
  });
  return NextResponse.json({ data: reportes });
}

// POST → crea un reporte (token aleatorio)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;
  const { id } = await params;
  if (!(await expedienteVisible(id, user.rol)))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const reporte = await prisma.reporteExpediente.create({
    data: {
      token: randomBytes(18).toString("base64url"),
      expedienteId: id,
      creadoPor: user.id,
      incluyeActuaciones: body?.incluyeActuaciones ?? true,
      expiraEl: body?.expiraEl ? new Date(body.expiraEl) : null,
    },
    select: { id: true, token: true, activo: true, expiraEl: true, createdAt: true },
  });
  return NextResponse.json({ data: reporte }, { status: 201 });
}

// DELETE ?reporteId= → revoca (activo=false)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;
  const { id } = await params;
  if (!(await expedienteVisible(id, user.rol)))
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const reporteId = req.nextUrl.searchParams.get("reporteId");
  if (!reporteId) return NextResponse.json({ error: "Falta reporteId" }, { status: 400 });
  await prisma.reporteExpediente.updateMany({
    where: { id: reporteId, expedienteId: id },
    data: { activo: false },
  });
  return NextResponse.json({ data: { revocado: true } });
}
