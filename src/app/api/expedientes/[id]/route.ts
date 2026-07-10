import { NextRequest, NextResponse } from "next/server";
import { EstadoExpediente, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireFeature, filtroClientesPorRol } from "@/lib/api-auth";
import { crearNotificacion } from "@/lib/notificaciones";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;
  const { id } = await params;

  const expediente = await prisma.expediente.findFirst({
    where: { id, cliente: { ...filtroClientesPorRol(user.rol) } },
    include: {
      cliente: { select: { id: true, nombre: true, ruc: true } },
      responsable: { select: { id: true, nombre: true } },
      documentos: {
        orderBy: { createdAt: "desc" },
        include: { subidor: { select: { nombre: true } } },
      },
      historial: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { nombre: true } } },
      },
      tareas: {
        select: { id: true, titulo: true, estado: true, fechaLimite: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!expediente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ data: expediente });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;
  const { id } = await params;

  const existente = await prisma.expediente.findFirst({
    where: { id, cliente: { ...filtroClientesPorRol(user.rol) } },
  });
  if (!existente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (body.estado && !Object.values(EstadoExpediente).includes(body.estado)) {
    return NextResponse.json({ error: "Estado inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const data: Prisma.ExpedienteUncheckedUpdateInput = {
    ...(body.titulo !== undefined ? { titulo: body.titulo.trim() } : {}),
    ...(body.estado !== undefined ? { estado: body.estado } : {}),
    ...(body.responsableId !== undefined ? { responsableId: body.responsableId } : {}),
    ...(body.fechaLimite !== undefined
      ? { fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : null }
      : {}),
  };

  const expediente = await prisma.expediente.update({ where: { id }, data });

  if (body.estado !== undefined && body.estado !== existente.estado) {
    await prisma.historialExpediente.create({
      data: {
        expedienteId: id,
        estadoAnterior: existente.estado,
        estadoNuevo: body.estado,
        userId: user.id,
        comentario: body.comentario?.trim() || null,
      },
    });
  }

  if (body.responsableId && body.responsableId !== existente.responsableId && body.responsableId !== user.id) {
    await crearNotificacion({
      userId: body.responsableId,
      tipo: "EXPEDIENTE_ACTUALIZADO",
      mensaje: `Expediente asignado: ${expediente.titulo}`,
      entidadTipo: "Expediente",
      entidadId: expediente.id,
    });
  }

  return NextResponse.json({ data: expediente });
}
