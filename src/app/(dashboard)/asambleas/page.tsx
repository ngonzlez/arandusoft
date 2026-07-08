import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { TZ_PARAGUAY, formatPeriodo } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesSelector } from "@/components/estado-mensual/MesSelector";
import { AsambleasTabla } from "@/components/asambleas/AsambleasTabla";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Asambleas — ArandúSoft" };

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function AsambleasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  if (user.rol === "JURIDICO") redirect("/dashboard");

  const sp = await searchParams;
  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");
  const periodo = MES_RE.test(sp.mes ?? "") ? sp.mes! : mesActual;

  const clientes = await prisma.cliente.findMany({
    where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      asambleas: { where: { periodo } },
    },
  });

  return (
    <div>
      <PageHeader
        titulo="Calendario de Prioridades"
        subtitulo={`Asambleas y trámites — ${formatPeriodo(periodo)}`}
        acciones={<MesSelector mes={periodo} />}
      />

      {clientes.length === 0 ? (
        <div className="bg-white rounded-card border border-line">
          <EmptyState titulo="Sin clientes activos" />
        </div>
      ) : (
        <AsambleasTabla periodo={periodo} clientes={clientes} />
      )}
    </div>
  );
}
