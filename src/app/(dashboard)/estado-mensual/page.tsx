import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { TZ_PARAGUAY, formatPeriodo } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesSelector } from "@/components/estado-mensual/MesSelector";
import { EstadoMensualTabla } from "@/components/estado-mensual/EstadoMensualTabla";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Estado Mensual — ArandúSoft" };

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function EstadoMensualPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  if (user.rol === "JURIDICO") redirect("/dashboard");

  const sp = await searchParams;
  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");
  const mes = MES_RE.test(sp.mes ?? "") ? sp.mes! : mesActual;

  const clientes = await prisma.cliente.findMany({
    where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      ruc: true,
      obligaciones: { where: { activa: true }, select: { tipo: true } },
      estadosMensuales: {
        where: { mes },
        select: {
          obligacion: true,
          estado: true,
          fechaPresentacion: true,
          responsable: { select: { nombre: true } },
        },
      },
    },
  });

  const conObligaciones = clientes.filter((c) => c.obligaciones.length > 0);

  return (
    <div>
      <PageHeader
        titulo="Estado Mensual"
        subtitulo={formatPeriodo(mes)}
        acciones={<MesSelector mes={mes} />}
      />

      {conObligaciones.length === 0 ? (
        <div className="bg-white rounded-card border border-line">
          <EmptyState
            titulo="Sin clientes con obligaciones"
            descripcion="Configurá obligaciones activas en la ficha de cada cliente para verlas acá."
          />
        </div>
      ) : (
        <EstadoMensualTabla mes={mes} clientes={conObligaciones} />
      )}
    </div>
  );
}
