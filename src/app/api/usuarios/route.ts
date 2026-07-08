import { NextRequest, NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

// Lista liviana para selects (responsable, destinatario de archivos).
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

const ROLES_ASIGNABLES: Rol[] = ["ADMIN", "CONTABLE", "JURIDICO"];

// Alta de usuario (solo ADMIN). SUPERADMIN jamás se crea por acá.
export async function POST(req: NextRequest) {
  const { error } = await requireApiSession(["ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { nombre, email, password, rol } = body ?? {};

  if (!nombre?.trim() || !email?.trim() || !password || !ROLES_ASIGNABLES.includes(rol)) {
    return NextResponse.json(
      { error: "Nombre, correo, contraseña y rol válido son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const emailNorm = email.trim().toLowerCase();
  const existente = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existente) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese correo", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const user = await prisma.user.create({
    data: {
      nombre: nombre.trim(),
      email: emailNorm,
      password: await bcrypt.hash(password, 10),
      rol,
    },
    select: { id: true, nombre: true, email: true, rol: true },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
