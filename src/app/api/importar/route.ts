import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { parsearExcelClientes, importarClientes } from "@/lib/importar";

const MAX_XLSX_BYTES = 5 * 1024 * 1024;

// modo=preview → valida y devuelve filas válidas/errores sin tocar la DB.
// modo=confirmar → vuelve a validar el mismo archivo e importa las válidas.
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN"]);
  if (error) return error;

  const modo = req.nextUrl.searchParams.get("modo") ?? "preview";

  const form = await req.formData().catch(() => null);
  const archivo = form?.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo .xlsx", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (archivo.size > MAX_XLSX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera 5 MB", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  let resultado;
  try {
    resultado = await parsearExcelClientes(Buffer.from(await archivo.arrayBuffer()));
  } catch (e) {
    console.error("Error parseando Excel:", e);
    return NextResponse.json(
      { error: "No se pudo leer el archivo. ¿Es un .xlsx válido?", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  if (modo === "preview") {
    return NextResponse.json({ data: resultado });
  }

  const importados = await importarClientes(resultado.validas, user.id, user.id);

  return NextResponse.json({
    data: {
      importados,
      conError: resultado.errores.length,
      errores: resultado.errores,
    },
  });
}
