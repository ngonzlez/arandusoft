import { NextRequest, NextResponse } from "next/server";
import { EstadoTarea, Prioridad, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroTareasPorRol } from "@/lib/api-auth";
import { crearNotificacion } from "@/lib/notificaciones";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const { id } = await params;

  const existente = await prisma.tarea.findFirst({
    where: {
      id,
      ...filtroTareasPorRol(user.rol),
    },
  });
  if (!existente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Cuerpo inválido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (body.estado && !Object.values(EstadoTarea).includes(body.estado)) {
    return NextResponse.json(
      { error: "Estado inválido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  if (body.prioridad && !Object.values(Prioridad).includes(body.prioridad)) {
    return NextResponse.json(
      { error: "Prioridad inválida", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const data: Prisma.TareaUncheckedUpdateInput = {
    ...(body.titulo !== undefined ? { titulo: body.titulo.trim() } : {}),
    ...(body.descripcion !== undefined ? { descripcion: body.descripcion?.trim() || null } : {}),
    ...(body.estado !== undefined ? { estado: body.estado } : {}),
    ...(body.prioridad !== undefined ? { prioridad: body.prioridad } : {}),
    ...(body.responsableId !== undefined ? { responsableId: body.responsableId } : {}),
    ...(body.fechaLimite !== undefined
      ? { fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : null }
      : {}),
    ...(body.checklist !== undefined ? { checklist: body.checklist } : {}),
  };

  const tarea = await prisma.tarea.update({ where: { id }, data });

  // Notificar reasignación
  if (body.responsableId && body.responsableId !== existente.responsableId && body.responsableId !== user.id) {
    await crearNotificacion({
      userId: body.responsableId,
      tipo: "TAREA_ASIGNADA",
      mensaje: `Tarea asignada: ${tarea.titulo}`,
      entidadTipo: "Tarea",
      entidadId: tarea.id,
    });
  }

  return NextResponse.json({ data: tarea });
}
