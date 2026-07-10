import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol, filtroPresupuestosPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { getEmisorPresupuesto } from "@/lib/presupuestos";
import { PageHeader } from "@/components/layout/PageHeader";
import { PresupuestoEditor, type PresupuestoInicial } from "@/components/presupuestos/PresupuestoEditor";

export const metadata = { title: "Editar presupuesto — ArandúSoft" };

export default async function EditarPresupuestoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const { id } = await params;

  if (!(await tieneFeature("presupuestos"))) redirect("/dashboard");

  const presupuesto = await prisma.presupuesto.findFirst({
    where: { id, ...filtroPresupuestosPorRol(user.rol) },
  });
  if (!presupuesto) notFound();

  // Solo borradores y plantillas se editan
  if (presupuesto.estado !== "BORRADOR" && !presupuesto.esPlantilla) {
    redirect("/presupuestos");
  }

  const [clientes, emisor] = await Promise.all([
    prisma.cliente.findMany({
      where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, ruc: true, direccion: true, telefono: true, email: true },
    }),
    getEmisorPresupuesto(),
  ]);

  const inicial: PresupuestoInicial = {
    id: presupuesto.id,
    esPlantilla: presupuesto.esPlantilla,
    nombrePlantilla: presupuesto.nombrePlantilla,
    clienteId: presupuesto.clienteId,
    destNombre: presupuesto.destNombre,
    destRuc: presupuesto.destRuc,
    destDireccion: presupuesto.destDireccion,
    destTelefono: presupuesto.destTelefono,
    destEmail: presupuesto.destEmail,
    validezDias: presupuesto.validezDias,
    items: JSON.parse(JSON.stringify(presupuesto.items)),
    descuento: presupuesto.descuento,
    notas: presupuesto.notas,
    datosBancarios: presupuesto.datosBancarios,
    firmaDataUrl: presupuesto.firmaDataUrl,
    firmante: presupuesto.firmante,
  };

  return (
    <div>
      <PageHeader
        titulo={presupuesto.esPlantilla ? `Plantilla: ${presupuesto.nombrePlantilla}` : "Editar borrador"}
      />
      <PresupuestoEditor clientes={clientes} emisor={emisor} inicial={inicial} />
    </div>
  );
}
