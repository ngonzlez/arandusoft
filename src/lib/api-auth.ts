import { NextResponse } from "next/server";
import { Prisma, Rol, TipoCliente } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getEstadoLicencia } from "@/lib/licencia";

type SessionUser = { id: string; rol: Rol; email?: string | null; name?: string | null };

// Guard estándar para API routes: sesión válida + licencia activa + rol permitido.
// Devuelve { user } o { error } (NextResponse listo para retornar).
export async function requireApiSession(rolesPermitidos?: Rol[]): Promise<
  { user: SessionUser; error?: never } | { user?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const user = session.user as SessionUser;

  // Superadmin gestiona la licencia — no se bloquea a sí mismo.
  if (user.rol !== "SUPERADMIN") {
    const { activa } = await getEstadoLicencia();
    if (!activa) {
      return {
        error: NextResponse.json(
          { error: "Licencia suspendida", code: "LICENCIA_SUSPENDIDA" },
          { status: 403 }
        ),
      };
    }
  }

  if (rolesPermitidos && !rolesPermitidos.includes(user.rol)) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
    };
  }

  return { user };
}

// Filtro de visibilidad de clientes según rol (regla dura del PRD):
// CONTABLE ve CONTABLE+AMBOS, JURIDICO ve JURIDICO+AMBOS, ADMIN todo.
export function filtroClientesPorRol(rol: Rol): Prisma.ClienteWhereInput {
  if (rol === "CONTABLE")
    return { tipo: { in: [TipoCliente.CONTABLE, TipoCliente.AMBOS] } };
  if (rol === "JURIDICO")
    return { tipo: { in: [TipoCliente.JURIDICO, TipoCliente.AMBOS] } };
  return {};
}
