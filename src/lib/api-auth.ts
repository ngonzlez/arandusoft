import { NextResponse } from "next/server";
import { Prisma, Rol, TipoCliente } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getEstadoLicencia, tieneFeature } from "@/lib/licencia";
import { FEATURES_DISPONIBLES, type Feature } from "@/lib/features";

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

// Gate de feature: el superadmin las prende/apaga por estudio desde
// /admin/licencia. Si está apagada, la API la bloquea de verdad (no
// alcanza con ocultar el ítem del nav).
export async function requireFeature(f: Feature): Promise<NextResponse | null> {
  if (!(await tieneFeature(f))) {
    return NextResponse.json(
      {
        error: `${FEATURES_DISPONIBLES[f].label} no está habilitado para este estudio`,
        code: "MODULO_DESHABILITADO",
      },
      { status: 403 }
    );
  }
  return null;
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

// Para modelos con clienteId OPCIONAL (Tarea, Vencimiento): visible si no
// tiene cliente, o si el cliente es visible por rol. OJO: un filtro vacío
// (ADMIN) nunca debe anidarse como `cliente: {}` dentro de un OR — Prisma
// omite esa rama silenciosamente en vez de tratarla como "sin restricción",
// dejando el OR más restrictivo de lo pensado. Por eso el early-return acá.
export function filtroTareasPorRol(rol: Rol): Prisma.TareaWhereInput {
  const filtroCliente = filtroClientesPorRol(rol);
  if (Object.keys(filtroCliente).length === 0) return {};
  return { OR: [{ clienteId: null }, { cliente: filtroCliente }] };
}

// Mismo patrón para Presupuesto (clienteId opcional — destinatario manual
// es visible para todos los roles).
export function filtroPresupuestosPorRol(rol: Rol): Prisma.PresupuestoWhereInput {
  const filtroCliente = filtroClientesPorRol(rol);
  if (Object.keys(filtroCliente).length === 0) return {};
  return { OR: [{ clienteId: null }, { cliente: filtroCliente }] };
}
