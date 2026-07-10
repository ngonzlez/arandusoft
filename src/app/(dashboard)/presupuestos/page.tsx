import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroPresupuestosPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { PresupuestosLista } from "@/components/presupuestos/PresupuestosLista";

export const metadata = { title: "Presupuestos — ArandúSoft" };

export default async function PresupuestosPage() {
  const session = await auth();
  const user = session!.user;

  if (!(await tieneFeature("presupuestos"))) redirect("/dashboard");

  const [presupuestos, plantillas] = await Promise.all([
    prisma.presupuesto.findMany({
      where: { esPlantilla: false, ...filtroPresupuestosPorRol(user.rol) },
      orderBy: { createdAt: "desc" },
      include: { creador: { select: { nombre: true } } },
    }),
    prisma.presupuesto.findMany({
      where: { esPlantilla: true, estado: { not: "ANULADO" }, ...filtroPresupuestosPorRol(user.rol) },
      orderBy: { nombrePlantilla: "asc" },
      include: { creador: { select: { nombre: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Presupuestos"
        subtitulo={`${presupuestos.length} en total`}
        acciones={
          <Link href="/presupuestos/nuevo">
            <Button>Nuevo presupuesto</Button>
          </Link>
        }
      />
      <PresupuestosLista
        presupuestos={JSON.parse(JSON.stringify(presupuestos))}
        plantillas={JSON.parse(JSON.stringify(plantillas))}
      />
    </div>
  );
}
