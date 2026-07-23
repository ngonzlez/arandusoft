import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, requireFeature, filtroClientesPorRol } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { CsjError } from "@/lib/csj/client";
import { obtenerClienteCsj } from "@/lib/csj/credenciales";
import { importarCaso } from "@/lib/csj/importar";

// POST /api/csj/importar  { casoId, instancia, clienteId? }
// Importa (o re-sincroniza) un caso CSJ como Expediente + Actuaciones + Partes.
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const body = await req.json().catch(() => null);
  const casoId = Number(body?.casoId);
  const instancia = (body?.instancia ?? "").trim();
  const clienteId = body?.clienteId || null;

  if (!casoId || !/^\d+:\d+$/.test(instancia)) {
    return NextResponse.json(
      { error: "casoId e instancia (formato origen:esCorte) son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Si se ata a un cliente, validar visibilidad por rol.
  if (clienteId) {
    const cli = await prisma.cliente.findFirst({
      where: { id: clienteId, ...filtroClientesPorRol(user.rol) },
      select: { id: true },
    });
    if (!cli) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const csj = await obtenerClienteCsj(user.id);
  if (!csj) {
    return NextResponse.json(
      { error: "No hay una cuenta CSJ vinculada", code: "CSJ_NO_VINCULADO" },
      { status: 409 }
    );
  }

  try {
    const resultado = await importarCaso(csj, {
      casoId,
      instancia,
      responsableId: user.id,
      clienteId,
    });
    return NextResponse.json({ data: resultado }, { status: resultado.creado ? 201 : 200 });
  } catch (e) {
    console.error("[csj/importar]", e);
    const msg =
      e instanceof CsjError
        ? e.message
        : `Error importando el expediente: ${e instanceof Error ? e.message : "desconocido"}`;
    return NextResponse.json({ error: msg, code: "CSJ_ERROR" }, { status: 502 });
  }
}
