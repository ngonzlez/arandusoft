import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, requireFeature } from "@/lib/api-auth";
import { CsjError } from "@/lib/csj/client";
import { obtenerClienteCsj } from "@/lib/csj/credenciales";
import { importarCaso } from "@/lib/csj/importar";

export const maxDuration = 300;

// POST /api/csj/importar-lote  { casos: [{casoId, instancia}], clienteId? }
// Importa varios casos en serie (traerDocumentos:false para velocidad).
export async function POST(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const body = await req.json().catch(() => null);
  const casos: { casoId: number; instancia: string }[] = Array.isArray(body?.casos) ? body.casos : [];
  const clienteId = body?.clienteId || null;
  if (casos.length === 0) {
    return NextResponse.json({ error: "Sin casos para importar", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const csj = await obtenerClienteCsj(user.id);
  if (!csj) {
    return NextResponse.json({ error: "No hay una cuenta CSJ vinculada", code: "CSJ_NO_VINCULADO" }, { status: 409 });
  }

  const resumen = { importados: 0, actualizados: 0, errores: [] as string[] };
  for (const c of casos) {
    if (!c.casoId || !/^\d+:\d+$/.test(c.instancia ?? "")) {
      resumen.errores.push(`caso inválido: ${c.casoId}`);
      continue;
    }
    try {
      const r = await importarCaso(csj, {
        casoId: Number(c.casoId),
        instancia: c.instancia,
        responsableId: user.id,
        clienteId,
        traerDocumentos: false,
      });
      if (r.creado) resumen.importados++;
      else resumen.actualizados++;
    } catch (e) {
      const msg = e instanceof CsjError ? e.message : e instanceof Error ? e.message : "error";
      resumen.errores.push(`caso ${c.casoId}: ${msg}`);
    }
  }

  return NextResponse.json({ data: resumen });
}
