import ExcelJS from "exceljs";
import { TipoCliente, TipoObligacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validarRuc } from "@/lib/clientes";

// Columnas de la plantilla de clientes (orden fijo, fila 1 = headers)
export const COLUMNAS_PLANTILLA = [
  "Nombre",
  "RUC",
  "Cedula",
  "Telefono",
  "Correo",
  "Direccion",
  "Tipo",
  "Obligaciones",
] as const;

export interface FilaCliente {
  fila: number;
  nombre: string;
  ruc: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  tipo: TipoCliente;
  obligaciones: TipoObligacion[];
}

export interface FilaError {
  fila: number;
  errores: string[];
  datos: Record<string, string>;
}

export interface ResultadoParseo {
  validas: FilaCliente[];
  errores: FilaError[];
}

function celda(row: ExcelJS.Row, col: number): string {
  const v = row.getCell(col).value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "text" in v) return String(v.text).trim();
  return String(v).trim();
}

export async function parsearExcelClientes(buffer: Buffer): Promise<ResultadoParseo> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const hoja = workbook.worksheets[0];
  if (!hoja) throw new Error("El archivo no tiene hojas");

  const validas: FilaCliente[] = [];
  const errores: FilaError[] = [];
  const rucsEnArchivo = new Set<string>();

  const rucsExistentes = new Set(
    (await prisma.cliente.findMany({ select: { ruc: true } })).map((c) => c.ruc)
  );

  hoja.eachRow((row, num) => {
    if (num === 1) return; // headers

    const datos = {
      nombre: celda(row, 1),
      ruc: celda(row, 2),
      cedula: celda(row, 3),
      telefono: celda(row, 4),
      email: celda(row, 5),
      direccion: celda(row, 6),
      tipo: celda(row, 7).toUpperCase(),
      obligaciones: celda(row, 8),
    };

    // Fila totalmente vacía: ignorar
    if (!datos.nombre && !datos.ruc) return;

    const errs: string[] = [];

    if (!datos.nombre) errs.push("Falta el nombre");
    if (!datos.ruc) errs.push("Falta el RUC");
    else if (!validarRuc(datos.ruc)) errs.push(`RUC inválido: "${datos.ruc}"`);
    else if (rucsEnArchivo.has(datos.ruc)) errs.push("RUC repetido en el archivo");
    else if (rucsExistentes.has(datos.ruc)) errs.push("Ya existe un cliente con ese RUC");

    const tipoNormalizado = datos.tipo === "MIXTO" ? "AMBOS" : datos.tipo;
    if (!Object.values(TipoCliente).includes(tipoNormalizado as TipoCliente)) {
      errs.push(`Tipo inválido: "${datos.tipo}" (usar CONTABLE, JURIDICO o AMBOS)`);
    }

    const obligaciones: TipoObligacion[] = [];
    if (datos.obligaciones) {
      for (const raw of datos.obligaciones.split(/[,;]/)) {
        const o = raw.trim().toUpperCase().replace(/\s+/g, "_");
        if (!o) continue;
        if (Object.values(TipoObligacion).includes(o as TipoObligacion)) {
          obligaciones.push(o as TipoObligacion);
        } else {
          errs.push(`Obligación desconocida: "${raw.trim()}"`);
        }
      }
    }

    if (errs.length > 0) {
      errores.push({ fila: num, errores: errs, datos });
      return;
    }

    rucsEnArchivo.add(datos.ruc);
    validas.push({
      fila: num,
      nombre: datos.nombre,
      ruc: datos.ruc,
      cedula: datos.cedula || null,
      telefono: datos.telefono || null,
      email: datos.email || null,
      direccion: datos.direccion || null,
      tipo: tipoNormalizado as TipoCliente,
      obligaciones: [...new Set(obligaciones)],
    });
  });

  return { validas, errores };
}

export async function importarClientes(
  filas: FilaCliente[],
  responsableId: string,
  actualizadoPor: string
): Promise<number> {
  let importados = 0;
  for (const f of filas) {
    await prisma.cliente.create({
      data: {
        nombre: f.nombre,
        ruc: f.ruc,
        cedula: f.cedula,
        telefono: f.telefono,
        email: f.email,
        direccion: f.direccion,
        tipo: f.tipo,
        responsableId,
        actualizadoPor,
        obligaciones: { create: f.obligaciones.map((tipo) => ({ tipo })) },
      },
    });
    importados++;
  }
  return importados;
}

export async function generarPlantilla(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Clientes");

  hoja.addRow([...COLUMNAS_PLANTILLA]);
  hoja.getRow(1).font = { bold: true };
  hoja.columns.forEach((c) => (c.width = 22));

  hoja.addRow([
    "Ejemplo S.A.",
    "80012345-7",
    "1234567",
    "0981123456",
    "contacto@ejemplo.com.py",
    "Asunción",
    "CONTABLE",
    "IVA, IRE_GENERAL, IPS",
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
