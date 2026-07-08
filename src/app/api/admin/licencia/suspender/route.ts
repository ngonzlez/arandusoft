import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { invalidarCacheLicencia } from "@/lib/licencia";

export async function POST(req: NextRequest) {
  const { error } = await requireApiSession(["SUPERADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => ({}));

  const licencia = await prisma.licencia.findFirst({ orderBy: { createdAt: "desc" } });
  if (!licencia) {
    return NextResponse.json({ error: "No hay licencia creada" }, { status: 404 });
  }

  const actualizada = await prisma.licencia.update({
    where: { id: licencia.id },
    data: {
      estado: "SUSPENDIDA",
      mensajeSuspension: body?.mensaje?.trim() || null,
    },
  });

  invalidarCacheLicencia(); // suspensión inmediata en este proceso

  return NextResponse.json({ data: actualizada });
}
