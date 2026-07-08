import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TZ_PARAGUAY, formatPeriodo } from "@/lib/format";
import {
  generarVencimientosIvaDelMes,
  filtroVencimientosPorRol,
} from "@/lib/vencimientos";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesSelector } from "@/components/estado-mensual/MesSelector";
import { CalendarioGrid } from "@/components/calendario/CalendarioGrid";
import { VencimientosLista } from "@/components/calendario/VencimientosLista";

export const metadata = { title: "Vencimientos — ArandúSoft" };

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const sp = await searchParams;

  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");
  const mes = MES_RE.test(sp.mes ?? "") ? sp.mes! : mesActual;
  const [año, mesNum] = mes.split("-").map(Number);

  // Generación automática idempotente de IVA por RUC para el mes visible
  await generarVencimientosIvaDelMes(año, mesNum);

  const desde = new Date(Date.UTC(año, mesNum - 1, 1));
  const hasta = new Date(Date.UTC(año, mesNum, 0, 23, 59, 59));

  const vencimientos = await prisma.vencimiento.findMany({
    where: {
      fechaVencimiento: { gte: desde, lte: hasta },
      ...filtroVencimientosPorRol(user.rol),
    },
    orderBy: { fechaVencimiento: "asc" },
    include: {
      cliente: { select: { id: true, nombre: true } },
      responsable: { select: { nombre: true } },
    },
  });

  const clientes = await prisma.cliente.findMany({
    where: { estado: "ACTIVO" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <div>
      <PageHeader
        titulo="Calendario de Vencimientos"
        subtitulo={formatPeriodo(mes)}
        acciones={<MesSelector mes={mes} />}
      />

      <div className="space-y-6">
        <CalendarioGrid año={año} mes={mesNum} vencimientos={vencimientos} clientes={clientes} />
        <VencimientosLista vencimientos={vencimientos} clientes={clientes} />
      </div>
    </div>
  );
}
