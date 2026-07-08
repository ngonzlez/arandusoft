import { NextRequest, NextResponse } from "next/server";
import { TipoVencimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";
import { filtroVencimientosPorRol } from "@/lib/vencimientos";

// Lista de vencimientos en un rango de fechas, con filtros opcionales.
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const desde = sp.get("desde") ? new Date(sp.get("desde")!) : new Date();
  const hasta = sp.get("hasta")
    ? new Date(sp.get("hasta")!)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const clienteId = sp.get("clienteId");
  const tipo = sp.get("tipo") as TipoVencimiento | null;

  if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
    return NextResponse.json(
      { error: "Rango de fechas inválido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const vencimientos = await prisma.vencimiento.findMany({
    where: {
      fechaVencimiento: { gte: desde, lte: hasta },
      ...filtroVencimientosPorRol(user.rol),
      ...(clienteId ? { clienteId } : {}),
      ...(tipo && Object.values(TipoVencimiento).includes(tipo) ? { tipo } : {}),
    },
    orderBy: { fechaVencimiento: "asc" },
    include: {
      cliente: { select: { id: true, nombre: true, ruc: true } },
      responsable: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({ data: vencimientos });
}

// Alta manual (todo tipo salvo IVA que se genera automático — se permite igual).
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { clienteId, tipo, fechaVencimiento, responsableId } = body ?? {};

  if (!Object.values(TipoVencimiento).includes(tipo) || !fechaVencimiento) {
    return NextResponse.json(
      { error: "Tipo y fecha son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const fecha = new Date(fechaVencimiento);
  if (isNaN(fecha.getTime())) {
    return NextResponse.json(
      { error: "Fecha inválida", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
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

  const vencimiento = await prisma.vencimiento.create({
    data: {
      clienteId: clienteId || null,
      tipo,
      fechaVencimiento: fecha,
      responsableId: responsableId || user.id,
    },
  });

  return NextResponse.json({ data: vencimiento }, { status: 201 });
}
