import { NextRequest, NextResponse } from "next/server";
import { EstadoObligacion, TipoObligacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";

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

  const clientes = await prisma.cliente.findMany({
    where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      ruc: true,
      obligaciones: { where: { activa: true }, select: { tipo: true } },
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

  return NextResponse.json({ data: { mes, clientes } });
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
    select: { id: true, estadoFiscal: true },
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

  // Estado fiscal automático: solo alterna AL_DIA/ATRASADO.
  // CCT y VECTOR_FISCAL son estados manuales — no se tocan.
  if (cliente.estadoFiscal === "AL_DIA" || cliente.estadoFiscal === "ATRASADO") {
    const vencidas = await prisma.estadoMensual.count({
      where: { clienteId, estado: "VENCIDO" },
    });
    const nuevoEstadoFiscal = vencidas > 0 ? "ATRASADO" : "AL_DIA";
    if (nuevoEstadoFiscal !== cliente.estadoFiscal) {
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { estadoFiscal: nuevoEstadoFiscal, actualizadoPor: user.id },
      });
    }
  }

  return NextResponse.json({ data: registro });
}
