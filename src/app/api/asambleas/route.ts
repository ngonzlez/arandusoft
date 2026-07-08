import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession, filtroClientesPorRol } from "@/lib/api-auth";

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const CAMPOS_CHECK = [
  "asambleaSolicitada",
  "asambleaConfirmada",
  "idu",
  "mttes",
  "regAdm",
  "ips",
  "libros",
  "contAdm",
] as const;

type CampoCheck = (typeof CAMPOS_CHECK)[number];

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE"]);
  if (error) return error;

  const periodo = req.nextUrl.searchParams.get("periodo") ?? "";
  if (!MES_RE.test(periodo)) {
    return NextResponse.json(
      { error: "Período inválido (AAAA-MM)", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const clientes = await prisma.cliente.findMany({
    where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      asambleas: { where: { periodo } },
    },
  });

  return NextResponse.json({ data: { periodo, clientes } });
}

// Tildar una celda o setear fecha EEFF. Auditoría por celda en el Json `auditoria`.
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { clienteId, periodo, campo, valor, fechaEEFF } = body ?? {};

  if (!clienteId || !MES_RE.test(periodo ?? "")) {
    return NextResponse.json(
      { error: "Datos inválidos", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const esCheck = CAMPOS_CHECK.includes(campo);
  const esFecha = campo === "fechaEEFF";
  if (!esCheck && !esFecha) {
    return NextResponse.json(
      { error: "Campo inválido", code: "VALIDATION_ERROR" },
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

  const existente = await prisma.asambleaPrioridad.findUnique({
    where: { clienteId_periodo: { clienteId, periodo } },
  });

  const auditoria = {
    ...((existente?.auditoria as Record<string, unknown>) ?? {}),
    [campo]: { userId: user.id, at: new Date().toISOString() },
  };

  const dataCampo: Prisma.AsambleaPrioridadUncheckedUpdateInput = esCheck
    ? { [campo as CampoCheck]: !!valor }
    : { fechaEEFF: fechaEEFF ? new Date(fechaEEFF) : null };

  const registro = await prisma.asambleaPrioridad.upsert({
    where: { clienteId_periodo: { clienteId, periodo } },
    create: {
      clienteId,
      periodo,
      ...(esCheck ? { [campo as CampoCheck]: !!valor } : {}),
      ...(esFecha && fechaEEFF ? { fechaEEFF: new Date(fechaEEFF) } : {}),
      auditoria,
      ultimoEditorId: user.id,
    },
    update: {
      ...dataCampo,
      auditoria,
      ultimoEditorId: user.id,
    },
  });

  return NextResponse.json({ data: registro });
}
