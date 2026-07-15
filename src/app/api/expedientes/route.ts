import { NextRequest, NextResponse } from "next/server";
import { TipoExpediente } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireFeature, filtroClientesPorRol, filtroExpedientesPorRol } from "@/lib/api-auth";
import { crearNotificacion } from "@/lib/notificaciones";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const sp = req.nextUrl.searchParams;
  const clienteId = sp.get("clienteId");
  const responsableId = sp.get("responsableId");

  const expedientes = await prisma.expediente.findMany({
    where: {
      ...(clienteId ? { clienteId } : {}),
      ...(responsableId ? { responsableId } : {}),
      ...filtroExpedientesPorRol(user.rol),
    },
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { id: true, nombre: true } },
      responsable: { select: { id: true, nombre: true } },
      ciudad: { select: { id: true, nombre: true } },
      juzgado: { select: { id: true, nombre: true } },
      secretaria: { select: { id: true, nombre: true } },
      _count: { select: { documentos: true, tareas: true } },
    },
  });

  return NextResponse.json({ data: expedientes });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const body = await req.json().catch(() => null);
  const {
    titulo,
    clienteId,
    tipo,
    responsableId,
    fechaInicio,
    fechaLimite,
    numero,
    anio,
    ciudadId,
    juzgadoId,
    secretariaId,
  } = body ?? {};

  if (!titulo?.trim() || !responsableId || !fechaInicio) {
    return NextResponse.json(
      { error: "Título, responsable y fecha de inicio son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (!Object.values(TipoExpediente).includes(tipo)) {
    return NextResponse.json({ error: "Tipo de expediente inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (clienteId) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, ...filtroClientesPorRol(user.rol) },
      select: { id: true },
    });
    if (!cliente) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
  }

  const expediente = await prisma.expediente.create({
    data: {
      titulo: titulo.trim(),
      clienteId: clienteId || null,
      tipo,
      responsableId,
      fechaInicio: new Date(fechaInicio),
      fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
      numero: numero?.trim() || null,
      anio: anio ? Number(anio) : null,
      ciudadId: ciudadId || null,
      juzgadoId: juzgadoId || null,
      secretariaId: secretariaId || null,
    },
  });

  await prisma.historialExpediente.create({
    data: {
      expedienteId: expediente.id,
      estadoNuevo: expediente.estado,
      userId: user.id,
      comentario: "Expediente creado",
    },
  });

  if (responsableId !== user.id) {
    await crearNotificacion({
      userId: responsableId,
      tipo: "EXPEDIENTE_ACTUALIZADO",
      mensaje: `Nuevo expediente asignado: ${expediente.titulo}`,
      entidadTipo: "Expediente",
      entidadId: expediente.id,
    });
  }

  return NextResponse.json({ data: expediente }, { status: 201 });
}
