import { NextRequest, NextResponse } from "next/server";
import { EstadoTarea, Prioridad } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol, filtroTareasPorRol, filtroExpedientesPorRol } from "@/lib/api-auth";
import { crearNotificacion } from "@/lib/notificaciones";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const responsableId = sp.get("responsableId");
  const clienteId = sp.get("clienteId");

  const tareas = await prisma.tarea.findMany({
    where: {
      ...(responsableId ? { responsableId } : {}),
      ...(clienteId ? { clienteId } : {}),
      // tareas de clientes no visibles por rol quedan fuera; sin cliente, visibles
      ...filtroTareasPorRol(user.rol),
    },
    orderBy: [{ prioridad: "asc" }, { fechaLimite: "asc" }],
    include: {
      cliente: { select: { id: true, nombre: true } },
      responsable: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({ data: tareas });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { titulo, descripcion, responsableId, prioridad, fechaLimite, checklist, expedienteId } =
    body ?? {};
  let { clienteId } = body ?? {};

  if (!titulo?.trim() || !responsableId) {
    return NextResponse.json(
      { error: "Título y responsable son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (prioridad && !Object.values(Prioridad).includes(prioridad)) {
    return NextResponse.json(
      { error: "Prioridad inválida", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Una tarea de expediente hereda el cliente del expediente — mantiene
  // consistente el filtro de visibilidad por rol (que se basa en clienteId).
  if (expedienteId) {
    const expediente = await prisma.expediente.findFirst({
      where: { id: expedienteId, ...filtroExpedientesPorRol(user.rol) },
      select: { clienteId: true },
    });
    if (!expediente) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    clienteId = expediente.clienteId;
  } else if (clienteId) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, ...filtroClientesPorRol(user.rol) },
      select: { id: true },
    });
    if (!cliente) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
  }

  const checklistLimpio = Array.isArray(checklist)
    ? checklist
        .filter((i: { texto?: string }) => i?.texto?.trim())
        .map((i: { texto: string }, idx: number) => ({
          id: `item-${idx}-${Math.random().toString(36).slice(2, 8)}`,
          texto: i.texto.trim(),
          hecho: false,
        }))
    : [];

  const tarea = await prisma.tarea.create({
    data: {
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
      clienteId: clienteId || null,
      expedienteId: expedienteId || null,
      responsableId,
      prioridad: prioridad ?? "MEDIA",
      fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
      checklist: checklistLimpio,
    },
  });

  if (responsableId !== user.id) {
    await crearNotificacion({
      userId: responsableId,
      tipo: "TAREA_ASIGNADA",
      mensaje: `Nueva tarea asignada: ${tarea.titulo}`,
      entidadTipo: "Tarea",
      entidadId: tarea.id,
    });
  }

  return NextResponse.json({ data: tarea }, { status: 201 });
}
