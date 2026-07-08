import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { generarPlantilla } from "@/lib/importar";

export async function GET() {
  const { error } = await requireApiSession(["ADMIN"]);
  if (error) return error;

  const buffer = await generarPlantilla();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-clientes-arandusoft.xlsx"',
    },
  });
}
