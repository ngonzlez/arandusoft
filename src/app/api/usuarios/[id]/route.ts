import { NextRequest, NextResponse } from "next/server";
import { Prisma, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";

const ROLES_ASIGNABLES: Rol[] = ["ADMIN", "CONTABLE", "JURIDICO"];

// Editar usuario: rol, activo (soft delete), nombre, reset de contraseña. Solo ADMIN.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiSession(["ADMIN"]);
  if (error) return error;
  const { id } = await params;

  const existente = await prisma.user.findFirst({
    where: { id, rol: { not: "SUPERADMIN" } }, // el superadmin no se toca desde acá
  });
  if (!existente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Cuerpo inválido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (body.rol !== undefined && !ROLES_ASIGNABLES.includes(body.rol)) {
    return NextResponse.json(
      { error: "Rol inválido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // No permitir que el admin se desactive o se cambie el rol a sí mismo
  if (id === user.id && (body.activo === false || (body.rol && body.rol !== "ADMIN"))) {
    return NextResponse.json(
      { error: "No podés quitarte tu propio acceso de administrador", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (body.password !== undefined && body.password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const email = body.email !== undefined ? body.email.trim().toLowerCase() : undefined;
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Correo inválido", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const data: Prisma.UserUpdateInput = {
    ...(body.nombre !== undefined ? { nombre: body.nombre.trim() } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(body.rol !== undefined ? { rol: body.rol } : {}),
    ...(body.activo !== undefined ? { activo: !!body.activo } : {}),
    ...(body.password !== undefined
      ? { password: await bcrypt.hash(body.password, 10) }
      : {}),
  };

  try {
    const actualizado = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, activo: true },
    });
    return NextResponse.json({ data: actualizado });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese correo", code: "VALIDATION_ERROR" },
        { status: 409 }
      );
    }
    throw e;
  }
}
