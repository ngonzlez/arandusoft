import { NextRequest, NextResponse } from "next/server";
import { Prisma, TipoObligacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";
import { encriptar, desencriptar } from "@/lib/crypto";
import { validarRuc } from "@/lib/clientes";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const { id } = await params;

  const cliente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientesPorRol(user.rol) },
    include: {
      responsable: { select: { id: true, nombre: true } },
      obligaciones: { where: { activa: true }, select: { tipo: true } },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // accesos: solo ADMIN, desencriptado server-side
  const { accesos: accesosCifrados, ...resto } = cliente;
  let accesos: unknown = undefined;
  if (user.rol === "ADMIN" && accesosCifrados) {
    try {
      accesos = JSON.parse(desencriptar(accesosCifrados));
    } catch {
      accesos = null;
    }
  }

  return NextResponse.json({
    data: { ...resto, ...(user.rol === "ADMIN" ? { accesos } : {}) },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const { id } = await params;

  const existente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientesPorRol(user.rol) },
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

  if (body.ruc && !validarRuc(body.ruc)) {
    return NextResponse.json(
      { error: "El RUC no tiene un formato válido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (body.ruc && body.ruc !== existente.ruc) {
    const dup = await prisma.cliente.findUnique({ where: { ruc: body.ruc } });
    if (dup) {
      return NextResponse.json(
        { error: "Ya existe un cliente con ese RUC", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
  }

  const data: Prisma.ClienteUpdateInput = {
    ...(body.nombre !== undefined ? { nombre: body.nombre.trim() } : {}),
    ...(body.ruc !== undefined ? { ruc: body.ruc.trim() } : {}),
    ...(body.cedula !== undefined ? { cedula: body.cedula?.trim() || null } : {}),
    ...(body.telefono !== undefined ? { telefono: body.telefono?.trim() || null } : {}),
    ...(body.email !== undefined ? { email: body.email?.trim() || null } : {}),
    ...(body.direccion !== undefined ? { direccion: body.direccion?.trim() || null } : {}),
    ...(body.tipo !== undefined ? { tipo: body.tipo } : {}),
    ...(body.estado !== undefined ? { estado: body.estado } : {}),
    ...(body.estadoFiscal !== undefined ? { estadoFiscal: body.estadoFiscal } : {}),
    ...(body.responsableId !== undefined
      ? { responsable: { connect: { id: body.responsableId } } }
      : {}),
    // Solo ADMIN toca accesos
    ...(user.rol === "ADMIN" && body.accesos !== undefined
      ? { accesos: body.accesos ? encriptar(JSON.stringify(body.accesos)) : null }
      : {}),
    actualizadoPor: user.id,
  };

  await prisma.cliente.update({ where: { id }, data });

  // Sincronizar obligaciones (soft: desactiva las que ya no están)
  if (Array.isArray(body.obligaciones)) {
    const nuevas: TipoObligacion[] = body.obligaciones.filter((o: string) =>
      Object.values(TipoObligacion).includes(o as TipoObligacion)
    );
    const actuales = await prisma.clienteObligacion.findMany({ where: { clienteId: id } });

    for (const tipo of nuevas) {
      const actual = actuales.find((a) => a.tipo === tipo);
      if (!actual) {
        await prisma.clienteObligacion.create({ data: { clienteId: id, tipo } });
      } else if (!actual.activa) {
        await prisma.clienteObligacion.update({
          where: { id: actual.id },
          data: { activa: true },
        });
      }
    }
    for (const actual of actuales) {
      if (actual.activa && !nuevas.includes(actual.tipo)) {
        await prisma.clienteObligacion.update({
          where: { id: actual.id },
          data: { activa: false },
        });
      }
    }
  }

  return NextResponse.json({ data: { id } });
}

// Soft delete: nunca se borra, pasa a INACTIVO (regla del PRD)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { user, error } = await requireApiSession(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const existente = await prisma.cliente.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.cliente.update({
    where: { id },
    data: { estado: "INACTIVO", actualizadoPor: user.id },
  });

  return NextResponse.json({ data: { id } });
}
