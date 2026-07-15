import { NextRequest, NextResponse } from "next/server";
import { EstadoCliente, Prisma, TipoCliente } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";
import { encriptar } from "@/lib/crypto";
import { validarRuc, parseObligaciones } from "@/lib/clientes-ui";
import { sincronizarVencimientoFijo } from "@/lib/clientes";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const tipo = sp.get("tipo") as TipoCliente | null;
  const estado = sp.get("estado") as EstadoCliente | null;

  const where: Prisma.ClienteWhereInput = {
    ...filtroClientesPorRol(user.rol),
    ...(tipo && Object.values(TipoCliente).includes(tipo) ? { tipo } : {}),
    ...(estado && Object.values(EstadoCliente).includes(estado) ? { estado } : {}),
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { ruc: { contains: q } },
          ],
        }
      : {}),
  };

  const clientes = await prisma.cliente.findMany({
    where,
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      ruc: true,
      tipo: true,
      estado: true,
      estadoFiscal: true,
      responsable: { select: { id: true, nombre: true } },
      // accesos NUNCA acá
    },
  });

  return NextResponse.json({ data: clientes });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.nombre || !body?.ruc || !body?.tipo || !body?.responsableId) {
    return NextResponse.json(
      { error: "Nombre, RUC, tipo y responsable son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (!validarRuc(body.ruc)) {
    return NextResponse.json(
      { error: "El RUC no tiene un formato válido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const existente = await prisma.cliente.findUnique({ where: { ruc: body.ruc } });
  if (existente) {
    return NextResponse.json(
      { error: "Ya existe un cliente con ese RUC", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Solo ADMIN puede cargar accesos
  const accesos =
    user.rol === "ADMIN" && body.accesos
      ? encriptar(JSON.stringify(body.accesos))
      : undefined;

  const obligaciones = parseObligaciones(body.obligaciones);
  const timbradoVencimiento = body.timbradoVencimiento ? new Date(body.timbradoVencimiento) : null;
  const firmaDigitalVencimiento = body.firmaDigitalVencimiento ? new Date(body.firmaDigitalVencimiento) : null;

  const cliente = await prisma.cliente.create({
    data: {
      nombre: body.nombre.trim(),
      ruc: body.ruc.trim(),
      cedula: body.cedula?.trim() || null,
      telefono: body.telefono?.trim() || null,
      email: body.email?.trim() || null,
      direccion: body.direccion?.trim() || null,
      observaciones: body.observaciones?.trim() || null,
      tipo: body.tipo,
      estado: body.estado ?? "ACTIVO",
      estadoFiscal: body.estadoFiscal ?? "AL_DIA",
      responsableId: body.responsableId,
      accesos,
      actualizadoPor: user.id,
      timbradoNumero: body.timbradoNumero?.trim() || null,
      timbradoVencimiento,
      firmaDigitalVencimiento,
      obligaciones: {
        create: obligaciones.map((o) => ({ tipo: o.tipo, diaVencimiento: o.diaVencimiento })),
      },
    },
    select: { id: true },
  });

  if (timbradoVencimiento) {
    await sincronizarVencimientoFijo(cliente.id, "TIMBRADO", timbradoVencimiento, body.responsableId);
  }
  if (firmaDigitalVencimiento) {
    await sincronizarVencimientoFijo(cliente.id, "FIRMA_DIGITAL", firmaDigitalVencimiento, body.responsableId);
  }

  return NextResponse.json({ data: cliente }, { status: 201 });
}
