import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

// Lista liviana para selects (responsable, destinatario de archivos).
// El CRUD completo de usuarios (alta/baja/roles) es de la Fase 10.
export async function GET() {
  const { error } = await requireApiSession();
  if (error) return error;

  const usuarios = await prisma.user.findMany({
    where: { activo: true, rol: { not: "SUPERADMIN" } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, email: true, rol: true },
  });

  return NextResponse.json({ data: usuarios });
}
