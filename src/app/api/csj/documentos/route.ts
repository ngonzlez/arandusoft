import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, requireFeature } from "@/lib/api-auth";
import { CsjError } from "@/lib/csj/client";
import { obtenerClienteCsj } from "@/lib/csj/credenciales";

// GET /api/csj/documentos?casoId=&instancia=&cod=
// Lista los documentos (PDF) de una actuación en CSJ.
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const sp = req.nextUrl.searchParams;
  const casoId = Number(sp.get("casoId"));
  const instancia = (sp.get("instancia") ?? "").trim();
  const cod = Number(sp.get("cod"));
  if (!casoId || !/^\d+:\d+$/.test(instancia) || !cod) {
    return NextResponse.json({ error: "Parámetros inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const csj = await obtenerClienteCsj(user.id);
  if (!csj) {
    return NextResponse.json({ error: "No hay una cuenta CSJ vinculada", code: "CSJ_NO_VINCULADO" }, { status: 409 });
  }

  try {
    const docs = await csj.getDocumentosActuacion(casoId, instancia, cod);
    return NextResponse.json({ data: docs });
  } catch (e) {
    const msg = e instanceof CsjError ? e.message : "Error consultando documentos en CSJ";
    return NextResponse.json({ error: msg, code: "CSJ_ERROR" }, { status: 502 });
  }
}
