import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol, filtroPresupuestosPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { getEmisorPresupuesto } from "@/lib/presupuestos";
import { PageHeader } from "@/components/layout/PageHeader";
import { PresupuestoEditor, type PresupuestoInicial } from "@/components/presupuestos/PresupuestoEditor";

export const metadata = { title: "Nuevo presupuesto — ArandúSoft" };

export default async function NuevoPresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ plantilla?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const sp = await searchParams;

  if (!(await tieneFeature("presupuestos"))) redirect("/dashboard");

  const [clientes, emisor] = await Promise.all([
    prisma.cliente.findMany({
      where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, ruc: true, direccion: true, telefono: true, email: true },
    }),
    getEmisorPresupuesto(),
  ]);

  // ?plantilla=<id>: precargar desde una plantilla (se crea un presupuesto
  // NUEVO con esos datos — la plantilla no se toca).
  let inicial: PresupuestoInicial | null = null;
  if (sp.plantilla) {
    const plantilla = await prisma.presupuesto.findFirst({
      where: { id: sp.plantilla, esPlantilla: true, ...filtroPresupuestosPorRol(user.rol) },
    });
    if (plantilla) {
      inicial = {
        clienteId: plantilla.clienteId,
        destNombre: plantilla.destNombre,
        destRuc: plantilla.destRuc,
        destDireccion: plantilla.destDireccion,
        destTelefono: plantilla.destTelefono,
        destEmail: plantilla.destEmail,
        validezDias: plantilla.validezDias,
        serviciosIncluidos: plantilla.serviciosIncluidos,
        items: JSON.parse(JSON.stringify(plantilla.items)),
        descuento: plantilla.descuento,
        notas: plantilla.notas,
        datosBancarios: plantilla.datosBancarios,
        firmaDataUrl: null,
        firmante: plantilla.firmante,
      };
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Nuevo presupuesto"
        subtitulo={inicial ? "Precargado desde plantilla" : undefined}
      />
      <PresupuestoEditor clientes={clientes} emisor={emisor} inicial={inicial} />
    </div>
  );
}
