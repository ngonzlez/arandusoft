import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroPresupuestosPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { getEmisorPresupuesto } from "@/lib/presupuestos";
import { PresupuestoDocumento } from "@/components/presupuestos/PresupuestoDocumento";
import { BotonImprimir } from "@/components/presupuestos/BotonImprimir";

export const metadata = { title: "Presupuesto — ArandúSoft" };

export default async function ImprimirPresupuestoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const { id } = await params;

  if (!(await tieneFeature("presupuestos"))) redirect("/dashboard");

  const [presupuesto, emisor] = await Promise.all([
    prisma.presupuesto.findFirst({
      where: { id, esPlantilla: false, ...filtroPresupuestosPorRol(user.rol) },
    }),
    getEmisorPresupuesto(),
  ]);
  if (!presupuesto) notFound();

  return (
    <div className="pb-10 print:pb-0">
      <BotonImprimir />
      <PresupuestoDocumento
        doc={JSON.parse(JSON.stringify(presupuesto))}
        emisor={emisor}
      />
    </div>
  );
}
