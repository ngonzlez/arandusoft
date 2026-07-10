import { Prisma, Rol } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { TZ_PARAGUAY, formatGuaranies } from "@/lib/format";

// ─── Ítems ───────────────────────────────────────────────────────────────

export interface ItemPresupuesto {
  id: string; // uuid del client, para keys de React
  descripcion: string;
  detalle?: string;
  cantidad: number;
  unidad?: string;
  precioUnitario: number;
}

const MAX_ITEMS = 100;

// Única superficie Json sin tipos de Prisma — validar SIEMPRE en el server.
export function validarItems(raw: unknown): ItemPresupuesto[] {
  if (!Array.isArray(raw)) throw new Error("Los ítems deben ser una lista");
  if (raw.length > MAX_ITEMS) throw new Error(`Máximo ${MAX_ITEMS} ítems`);

  return raw.map((it, i) => {
    const descripcion = typeof it?.descripcion === "string" ? it.descripcion.trim() : "";
    const cantidad = Number(it?.cantidad);
    const precioUnitario = Number(it?.precioUnitario);

    if (!descripcion) throw new Error(`Ítem ${i + 1}: la descripción es obligatoria`);
    if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 1_000_000)
      throw new Error(`Ítem ${i + 1}: cantidad inválida`);
    if (!Number.isFinite(precioUnitario) || precioUnitario < 0 || precioUnitario > 100_000_000_000)
      throw new Error(`Ítem ${i + 1}: precio inválido`);

    return {
      id: typeof it?.id === "string" && it.id ? it.id : `item-${i}`,
      descripcion,
      detalle: typeof it?.detalle === "string" && it.detalle.trim() ? it.detalle.trim() : undefined,
      cantidad,
      unidad: typeof it?.unidad === "string" && it.unidad.trim() ? it.unidad.trim() : undefined,
      precioUnitario,
    };
  });
}

// Recalcula SIEMPRE en el server — nunca se confía en totales del client.
export function calcularTotales(
  items: ItemPresupuesto[],
  descuento: number
): { subtotal: number; total: number } {
  const subtotal = items.reduce((acc, it) => acc + Math.round(it.cantidad * it.precioUnitario), 0);
  const total = Math.max(0, subtotal - descuento);
  return { subtotal, total };
}

// ─── Formato ─────────────────────────────────────────────────────────────

// "700/26" — padStart no trunca: 700 → "700/26", 1 → "001/26"
export function formatNumeroPresupuesto(numero: number, anio: number): string {
  return `${String(numero).padStart(3, "0")}/${String(anio).slice(-2)}`;
}

export function formatMonto(monto: number): string {
  return formatGuaranies(monto);
}

// ─── Snapshot del cliente ────────────────────────────────────────────────

export function snapshotCliente(c: {
  nombre: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
}): {
  destNombre: string;
  destRuc: string | null;
  destDireccion: string | null;
  destTelefono: string | null;
  destEmail: string | null;
} {
  return {
    destNombre: c.nombre,
    destRuc: c.ruc,
    destDireccion: c.direccion,
    destTelefono: c.telefono,
    destEmail: c.email,
  };
}

// ─── Emisor (bloque "DE" del documento) ──────────────────────────────────

export async function getEmisorPresupuesto(): Promise<{
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  tieneLogo: boolean;
  logoVersion: string;
}> {
  const [perfil, licencia] = await Promise.all([
    prisma.perfilEstudio.findFirst(),
    prisma.licencia.findFirst({ orderBy: { createdAt: "desc" }, select: { nombreEstudio: true } }),
  ]);

  return {
    nombre: perfil?.razonSocial || licencia?.nombreEstudio || "Mi Estudio",
    ruc: perfil?.ruc ?? null,
    telefono: perfil?.telefono ?? null,
    email: perfil?.email ?? null,
    direccion: perfil?.direccion ?? null,
    ciudad: perfil?.ciudad ?? null,
    tieneLogo: !!perfil?.logoPublicId,
    logoVersion: perfil?.updatedAt?.toISOString() ?? "",
  };
}

// ─── Armado de data para POST/PATCH ──────────────────────────────────────

const MAX_FIRMA_BYTES = 280_000; // dataURL de ~200KB de imagen

// Valida el body y arma el `data` de Prisma (campos comunes a crear/editar).
// Lanza Error con mensaje legible; "CLIENTE_NO_VISIBLE" → 404 arriba.
export async function armarDataPresupuesto(
  body: Record<string, unknown>,
  rol: Rol
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  // Destinatario: cliente del sistema (snapshot) o manual
  if (body.clienteId) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: String(body.clienteId), ...filtroClientesPorRol(rol) },
      select: { nombre: true, ruc: true, direccion: true, telefono: true, email: true },
    });
    if (!cliente) throw new Error("CLIENTE_NO_VISIBLE");
    data.clienteId = body.clienteId;
    Object.assign(data, snapshotCliente(cliente));
    // Permitir pisar el snapshot con ediciones manuales del form
    for (const campo of ["destNombre", "destRuc", "destDireccion", "destTelefono", "destEmail"]) {
      if (typeof body[campo] === "string" && (body[campo] as string).trim()) {
        data[campo] = (body[campo] as string).trim();
      }
    }
  } else if (body.clienteId === null || body.destNombre !== undefined) {
    if (body.clienteId === null) data.clienteId = null;
    for (const campo of ["destNombre", "destRuc", "destDireccion", "destTelefono", "destEmail"]) {
      if (body[campo] !== undefined) {
        data[campo] =
          typeof body[campo] === "string" && (body[campo] as string).trim()
            ? (body[campo] as string).trim()
            : null;
      }
    }
  }

  if (body.items !== undefined) {
    const items = validarItems(body.items);
    const descuento = Number(body.descuento ?? 0);
    if (!Number.isFinite(descuento) || descuento < 0) throw new Error("Descuento inválido");
    const { subtotal, total } = calcularTotales(items, descuento);
    data.items = items as unknown as object;
    data.descuento = descuento;
    data.subtotal = subtotal;
    data.total = total;
  }

  if (body.fechaEmision !== undefined) data.fechaEmision = new Date(String(body.fechaEmision));
  if (body.validezDias !== undefined) {
    const v = Number(body.validezDias);
    if (!Number.isInteger(v) || v < 1 || v > 365) throw new Error("La validez debe ser de 1 a 365 días");
    data.validezDias = v;
  }
  if (body.serviciosIncluidos !== undefined)
    data.serviciosIncluidos = String(body.serviciosIncluidos).trim() || null;
  if (body.notas !== undefined) data.notas = String(body.notas).trim() || null;
  if (body.datosBancarios !== undefined) data.datosBancarios = String(body.datosBancarios).trim() || null;
  if (body.firmante !== undefined) data.firmante = String(body.firmante).trim() || null;

  if (body.firmaDataUrl !== undefined) {
    if (body.firmaDataUrl === null || body.firmaDataUrl === "") {
      data.firmaDataUrl = null;
    } else {
      const firma = String(body.firmaDataUrl);
      if (!/^data:image\/(png|jpeg);base64,/.test(firma))
        throw new Error("La firma debe ser una imagen PNG o JPG");
      if (firma.length > MAX_FIRMA_BYTES) throw new Error("La firma supera 200 KB");
      data.firmaDataUrl = firma;
    }
  }

  return data;
}

// ─── Emisión con correlativo sin race ────────────────────────────────────

// Transacción + @@unique([anio, numero]) + retry: dos emisiones simultáneas
// leen el mismo max, una comete, la otra pega P2002 y reintenta con el max
// nuevo. El año se calcula en hora Paraguay (a las 21:00 del 31/12 en
// Asunción ya es 1/1 en UTC — sin esto el correlativo saltaría de año antes).
export async function emitirPresupuesto(id: string, userId: string, numeroManual?: number) {
  const anio = Number(formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy"));

  for (let intento = 0; intento < 3; intento++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const ultimo = await tx.presupuesto.findFirst({
          where: { anio, numero: { not: null } },
          orderBy: { numero: "desc" },
          select: { numero: true },
        });
        const numero = numeroManual ?? (ultimo?.numero ?? 0) + 1;
        return tx.presupuesto.update({
          where: { id },
          data: {
            numero,
            anio,
            estado: "EMITIDO",
            emitidoEl: new Date(),
            emitidoPor: userId,
          },
        });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        numeroManual === undefined
      ) {
        continue; // otro request ganó la carrera → reintentar con max nuevo
      }
      throw e; // numeroManual duplicado (u otro error) → manejar arriba
    }
  }
  throw new Error("No se pudo asignar número correlativo");
}
