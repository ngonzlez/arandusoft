import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerfilEstudioForm } from "@/components/configuracion/PerfilEstudioForm";

export const metadata = { title: "Configuración — ArandúSoft" };

export default async function ConfiguracionPage() {
  const session = await auth();
  if (session!.user.rol !== "ADMIN") redirect("/dashboard");

  const perfil = await prisma.perfilEstudio.findFirst();

  return (
    <div>
      <PageHeader
        titulo="Configuración del estudio"
        subtitulo="Datos que aparecen como emisor en presupuestos y documentos"
      />
      <PerfilEstudioForm perfil={JSON.parse(JSON.stringify(perfil))} />
    </div>
  );
}
