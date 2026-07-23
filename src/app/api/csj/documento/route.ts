import { NextRequest, NextResponse } from "next/server";
import { requireApiSession, requireFeature } from "@/lib/api-auth";
import { CsjError } from "@/lib/csj/client";
import { obtenerClienteCsj } from "@/lib/csj/credenciales";

// GET /api/csj/documento?casoId=&instancia=&cod=&id=
// Descarga el PDF de un documento de actuación desde CSJ y lo sirve al navegador.
export async function GET(req: NextRequest) {
  const { user, error } = await requireApiSession(["ADMIN", "JURIDICO"]);
  if (error) return error;
  const gate = await requireFeature("juridico");
  if (gate) return gate;

  const sp = req.nextUrl.searchParams;
  const casoId = Number(sp.get("casoId"));
  const instancia = (sp.get("instancia") ?? "").trim();
  const cod = Number(sp.get("cod"));
  const id = Number(sp.get("id"));
  if (!casoId || !/^\d+:\d+$/.test(instancia) || !cod || !id) {
    return NextResponse.json({ error: "Parámetros inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const csj = await obtenerClienteCsj(user.id);
  if (!csj) {
    return NextResponse.json({ error: "No hay una cuenta CSJ vinculada", code: "CSJ_NO_VINCULADO" }, { status: 409 });
  }

  try {
    const { data, contentType } = await csj.descargarDocumento(casoId, instancia, cod, id);
    return new NextResponse(Buffer.from(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="csj-${cod}-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof CsjError ? e.message : "Error descargando el documento";
    return NextResponse.json({ error: msg, code: "CSJ_ERROR" }, { status: 502 });
  }
}
