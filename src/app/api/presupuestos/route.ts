import { NextRequest, NextResponse } from "next/server";
import { EstadoPresupuesto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireApiSession,
  requireFeature,
  filtroPresupuestosPorRol,
} from "@/lib/api-auth";
import { armarDataPresupuesto } from "@/lib/presupuestos";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession();
  if (error) return error;
  const gate = await requireFeature("presupuestos");
  if (gate) return gate;

  const sp = req.nextUrl.searchParams;
  const plantillas = sp.get("plantillas") === "1";
  const estado = sp.get("estado");

  const presupuestos = await prisma.presupuesto.findMany({
    where: {
      esPlantilla: plantillas,
      ...(estado && Object.values(EstadoPresupuesto).includes(estado as EstadoPresupuesto)
        ? { estado: estado as EstadoPresupuesto }
        : {}),
      ...filtroPresupuestosPorRol(user.rol),
    },
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { id: true, nombre: true } },
      creador: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({ data: presupuestos });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "CONTABLE", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("presupuestos");
  if (gate) return gate;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo inválido", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (body.esPlantilla && !body.nombrePlantilla?.trim()) {
    return NextResponse.json(
      { error: "Las plantillas necesitan un nombre", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  let data;
  try {
    data = await armarDataPresupuesto(body, user.rol);
  } catch (e) {
    if (e instanceof Error && e.message === "CLIENTE_NO_VISIBLE") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Datos inválidos", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (!data.destNombre) {
    return NextResponse.json(
      { error: "El destinatario es obligatorio (cliente o nombre manual)", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const presupuesto = await prisma.presupuesto.create({
    data: {
      ...(data as object),
      destNombre: data.destNombre as string,
      esPlantilla: !!body.esPlantilla,
      nombrePlantilla: body.esPlantilla ? body.nombrePlantilla.trim() : null,
      creadoPor: user.id,
    },
  });

  return NextResponse.json({ data: presupuesto }, { status: 201 });
}
