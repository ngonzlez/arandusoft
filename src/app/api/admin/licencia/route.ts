import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireApiSession(["SUPERADMIN"]);
  if (error) return error;

  const licencia = await prisma.licencia.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      pagos: {
        orderBy: { fechaPago: "desc" },
        include: { registrador: { select: { nombre: true } } },
      },
    },
  });

  return NextResponse.json({ data: licencia });
}

// Registrar pago: guarda el pago y extiende el vencimiento.
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["SUPERADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { monto, fechaPago, nuevoVencimiento, nota } = body ?? {};

  if (!monto || monto <= 0 || !fechaPago || !nuevoVencimiento) {
    return NextResponse.json(
      { error: "Monto, fecha de pago y nuevo vencimiento son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const licencia = await prisma.licencia.findFirst({ orderBy: { createdAt: "desc" } });
  if (!licencia) {
    return NextResponse.json({ error: "No hay licencia creada" }, { status: 404 });
  }

  await prisma.pagoLicencia.create({
    data: {
      licenciaId: licencia.id,
      monto: Number(monto),
      fechaPago: new Date(fechaPago),
      nota: nota || null,
      registradoPor: user.id,
    },
  });

  const actualizada = await prisma.licencia.update({
    where: { id: licencia.id },
    data: { venceEl: new Date(nuevoVencimiento), estado: "ACTIVA" },
  });

  return NextResponse.json({ data: actualizada });
}
