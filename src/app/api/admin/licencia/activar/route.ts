import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { invalidarCacheLicencia } from "@/lib/licencia";

export async function POST() {
  const { error } = await requireApiSession(["SUPERADMIN"]);
  if (error) return error;

  const licencia = await prisma.licencia.findFirst({ orderBy: { createdAt: "desc" } });
  if (!licencia) {
    return NextResponse.json({ error: "No hay licencia creada" }, { status: 404 });
  }

  const actualizada = await prisma.licencia.update({
    where: { id: licencia.id },
    data: { estado: "ACTIVA", mensajeSuspension: null },
  });

  invalidarCacheLicencia(); // reactivación inmediata

  return NextResponse.json({ data: actualizada });
}
