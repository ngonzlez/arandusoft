import { NextRequest, NextResponse } from "next/server";
import { EstadoObligacion, TipoObligacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";
import { recalcularEstadoFiscal } from "@/lib/clientes";
import { sincronizarVencidosEstadoMensual, mapaFechasVencimiento } from "@/lib/estado-mensual";

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Matriz global del mes: clientes visibles × obligaciones activas + estado registrado.
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE"]);
  if (error) return error;

  const mes = req.nextUrl.searchParams.get("mes") ?? "";
  if (!MES_RE.test(mes)) {
    return NextResponse.json(
      { error: "Mes inválido (formato AAAA-MM)", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const [año, mesNum] = mes.split("-").map(Number);

  const clientesBase = await prisma.cliente.findMany({
    where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    select: {
      id: true,
      ruc: true,
      obligaciones: { where: { activa: true }, select: { tipo: true, diaVencimiento: true } },
    },
  });
  await sincronizarVencidosEstadoMensual(clientesBase, mes);

  const clientes = await prisma.cliente.findMany({
    where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      ruc: true,
      obligaciones: { where: { activa: true }, select: { tipo: true, diaVencimiento: true } },
      estadosMensuales: {
        where: { mes },
        select: {
          obligacion: true,
          estado: true,
          fechaPresentacion: true,
          responsable: { select: { nombre: true } },
        },
      },
    },
  });

  const clientesConFechas = clientes.map((c) => ({
    ...c,
    fechasVencimiento: mapaFechasVencimiento(c.ruc, c.obligaciones, año, mesNum),
  }));

  return NextResponse.json({ data: { mes, clientes: clientesConFechas } });
}

// Tildar/cambiar el estado de una celda (upsert) con auditoría userId+timestamp.
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { clienteId, mes, obligacion, estado } = body ?? {};

  if (
    !clienteId ||
    !MES_RE.test(mes ?? "") ||
    !Object.values(TipoObligacion).includes(obligacion) ||
    !Object.values(EstadoObligacion).includes(estado)
  ) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, ...filtroClientesPorRol(user.rol) },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const presentado = estado === "PRESENTADO";

  const registro = await prisma.estadoMensual.upsert({
    where: { clienteId_mes_obligacion: { clienteId, mes, obligacion } },
    create: {
      clienteId,
      mes,
      obligacion,
      estado,
      fechaPresentacion: presentado ? new Date() : null,
      responsableId: user.id,
    },
    update: {
      estado,
      fechaPresentacion: presentado ? new Date() : null,
      responsableId: user.id,
    },
  });

  await recalcularEstadoFiscal(clienteId, user.id);

  return NextResponse.json({ data: registro });
}
