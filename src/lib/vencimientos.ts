import { TipoVencimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import type { Rol } from "@prisma/client";

// Calendario perpetuo DNIT: día de vencimiento de IVA según terminación de RUC/CI.
export const CALENDARIO_DNIT: Record<string, number> = {
  "0": 7,
  "1": 9,
  "2": 11,
  "3": 13,
  "4": 15,
  "5": 17,
  "6": 19,
  "7": 21,
  "8": 23,
  "9": 25,
};

// Terminación = último dígito numérico del RUC SIN el dígito verificador.
// "80012345-7" → base "80012345" → terminación "5".
export function terminacionRuc(ruc: string): string | null {
  const base = ruc.includes("-") ? ruc.split("-")[0] : ruc;
  const digitos = base.replace(/\D/g, "");
  return digitos.length > 0 ? digitos[digitos.length - 1] : null;
}

// Vencimiento de IVA del período (año, mes 1-12) = día DNIT del MES SIGUIENTE.
// Se guarda a las 12:00 UTC (= 08:00 Paraguay) para evitar corrimientos de fecha.
export function calcularVencimientoIVA(ruc: string, año: number, mes: number): Date | null {
  const term = terminacionRuc(ruc);
  if (!term) return null;
  const dia = CALENDARIO_DNIT[term];
  // mes es 1-12; el vencimiento cae en el mes siguiente al período
  return new Date(Date.UTC(año, mes, dia, 12, 0, 0));
}

// Genera (idempotente) los vencimientos de IVA cuyo vencimiento cae en el mes dado,
// para todos los clientes activos con obligación IVA activa.
// Solo IVA se calcula automáticamente (única tabla oficial en el PRD);
// el resto de los tipos se cargan manualmente o por importación.
export async function generarVencimientosIvaDelMes(año: number, mes: number): Promise<number> {
  // Vencimiento en (año, mes) corresponde al período (año, mes-1)
  const periodoAño = mes === 1 ? año - 1 : año;
  const periodoMes = mes === 1 ? 12 : mes - 1;

  const clientes = await prisma.cliente.findMany({
    where: {
      estado: "ACTIVO",
      obligaciones: { some: { tipo: "IVA", activa: true } },
    },
    select: { id: true, ruc: true, responsableId: true },
  });

  let creados = 0;
  for (const c of clientes) {
    const fecha = calcularVencimientoIVA(c.ruc, periodoAño, periodoMes);
    if (!fecha) continue;

    await prisma.vencimiento.upsert({
      where: {
        clienteId_tipo_fechaVencimiento: {
          clienteId: c.id,
          tipo: "IVA",
          fechaVencimiento: fecha,
        },
      },
      create: {
        clienteId: c.id,
        tipo: "IVA",
        fechaVencimiento: fecha,
        responsableId: c.responsableId,
      },
      update: {}, // ya existe: no tocar estado ni flags de notificación
    });
    creados++;
  }
  return creados;
}

// Categoría visual del prototipo: Impositivo / Judicial / Administrativo
export type CategoriaVencimiento = "IMPOSITIVO" | "JUDICIAL" | "ADMINISTRATIVO";

export function categoriaVencimiento(tipo: TipoVencimiento): CategoriaVencimiento {
  if (tipo === "PLAZO_PROCESAL") return "JUDICIAL";
  if (["IPS", "MITES", "ASAMBLEA", "RENOVACION_CONTRATO", "OTRO"].includes(tipo))
    return "ADMINISTRATIVO";
  return "IMPOSITIVO";
}

export const CATEGORIA_COLORES: Record<CategoriaVencimiento, { bg: string; text: string }> = {
  IMPOSITIVO: { bg: "#FAF1D8", text: "#9A7416" },
  JUDICIAL: { bg: "#FBE9EC", text: "#C0344B" },
  ADMINISTRATIVO: { bg: "#E7EDF7", text: "#2F6FB0" },
};

// Filtro de vencimientos visibles por rol: los de clientes visibles + los sin cliente.
export function filtroVencimientosPorRol(rol: Rol) {
  const filtroCliente = filtroClientesPorRol(rol);
  if (Object.keys(filtroCliente).length === 0) return {};
  return { OR: [{ cliente: filtroCliente }, { clienteId: null }] };
}
