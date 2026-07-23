import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, requireFeature } from "@/lib/api-auth";
import { CsjError } from "@/lib/csj/client";
import { obtenerClienteCsj } from "@/lib/csj/credenciales";

// GET /api/csj/casos?caratula=...   → busca casos del abogado en CSJ
// GET /api/csj/casos               → últimos movimientos (10 días)
// Devuelve la lista cruda de CSJ para que la UI elija cuál importar.
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const csj = await obtenerClienteCsj(user.id);
  if (!csj) {
    return NextResponse.json(
      { error: "No hay una cuenta CSJ vinculada", code: "CSJ_NO_VINCULADO" },
      { status: 409 }
    );
  }

  const caratula = req.nextUrl.searchParams.get("caratula")?.trim();
  try {
    const resp = caratula
      ? await csj.buscarCasos(caratula)
      : await csj.getUltimosDiezDias();
    return NextResponse.json({ data: resp.resultado ?? [] });
  } catch (e) {
    const msg = e instanceof CsjError ? e.message : "Error consultando CSJ";
    return NextResponse.json({ error: msg, code: "CSJ_ERROR" }, { status: 502 });
  }
}
