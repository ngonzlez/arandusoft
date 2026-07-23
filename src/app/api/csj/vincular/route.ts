import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireFeature } from "@/lib/api-auth";
import { CsjClient, CsjError } from "@/lib/csj/client";
import { guardarCredencialCsj, estadoVinculacionCsj } from "@/lib/csj/credenciales";
import { sincronizarCatalogos } from "@/lib/csj/catalogos";

// GET → estado de vinculación del usuario (sin secretos)
export async function GET() {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  return NextResponse.json({ data: await estadoVinculacionCsj(user.id) });
}

// POST → vincular: valida el login contra CSJ y guarda las credenciales cifradas
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const body = await req.json().catch(() => null);
  const usuario = (body?.usuario ?? "").trim();
  const clave = body?.clave ?? "";
  if (!usuario || !clave) {
    return NextResponse.json(
      { error: "Usuario y contraseña son obligatorios", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Validar contra CSJ antes de guardar.
  const client = new CsjClient(usuario, clave);
  try {
    const login = await client.login();
    await guardarCredencialCsj(user.id, usuario, clave, login.datosUsuario.numeroDocumento);
    // Aprovechar la sesión para sincronizar catálogos (no bloqueante ante fallo).
    const catalogos = await sincronizarCatalogos(client).catch(() => null);
    return NextResponse.json({
      data: {
        vinculado: true,
        nombreUsuario: login.datosUsuario.nombreUsuario,
        matricula: login.datosUsuario.numeroDocumento,
        catalogos,
      },
    });
  } catch (e) {
    if (e instanceof CsjError) {
      const status = e.status === 401 ? 401 : 502;
      return NextResponse.json(
        { error: e.message, code: e.status === 401 ? "CSJ_CREDENCIALES" : "CSJ_ERROR" },
        { status }
      );
    }
    return NextResponse.json(
      { error: "No se pudo conectar con CSJ", code: "CSJ_ERROR" },
      { status: 502 }
    );
  }
}

// DELETE → desvincular (soft: marca inactiva)
export async function DELETE() {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  await prisma.credencialCsj.updateMany({ where: { userId: user.id }, data: { activo: false } });
  return NextResponse.json({ data: { vinculado: false } });
}
