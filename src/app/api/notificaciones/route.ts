import { NextRequest, NextResponse } from "next/server";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

// Notificaciones del usuario: historial 30 días (PRD 3.10).
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession();
  if (error) return error;

  const soloNoLeidas = req.nextUrl.searchParams.get("noLeidas") === "true";

  const notificaciones = await prisma.notificacion.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: subDays(new Date(), 30) },
      ...(soloNoLeidas ? { leida: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: notificaciones });
}

// Marcar leída una ({id}) o todas ({todas: true}).
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireApiSession();
  if (error) return error;

  const body = await req.json().catch(() => null);

  if (body?.todas === true) {
    await prisma.notificacion.updateMany({
      where: { userId: user.id, leida: false },
      data: { leida: true },
    });
    return NextResponse.json({ data: { ok: true } });
  }

  if (!body?.id) {
    return NextResponse.json(
      { error: "Falta id o todas", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const notif = await prisma.notificacion.findFirst({
    where: { id: body.id, userId: user.id },
    select: { id: true },
  });
  if (!notif) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.notificacion.update({
    where: { id: body.id },
    data: { leida: true },
  });

  return NextResponse.json({ data: { ok: true } });
}
