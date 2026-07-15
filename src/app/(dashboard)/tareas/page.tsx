import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TZ_PARAGUAY, formatPeriodo } from "@/lib/format";
import { filtroClientesPorRol, filtroTareasPorRol, filtroExpedientesPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { PageHeader } from "@/components/layout/PageHeader";
import { MesSelector } from "@/components/estado-mensual/MesSelector";
import { TareasBoard } from "@/components/tareas/TareasBoard";

export const metadata = { title: "Tareas — ArandúSoft" };

const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function TareasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; tarea?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const sp = await searchParams;

  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");
  const mes = MES_RE.test(sp.mes ?? "") ? sp.mes! : mesActual;
  const [año, mesNum] = mes.split("-").map(Number);
  const desde = new Date(Date.UTC(año, mesNum - 1, 1));
  const hasta = new Date(Date.UTC(año, mesNum, 0, 23, 59, 59));

  const juridicoActivo = await tieneFeature("juridico");

  const [tareas, usuarios, clientes, expedientes] = await Promise.all([
    prisma.tarea.findMany({
      where: { createdAt: { gte: desde, lte: hasta }, ...filtroTareasPorRol(user.rol) },
      orderBy: [{ prioridad: "asc" }, { fechaLimite: "asc" }],
      include: {
        cliente: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
      },
    }),
    prisma.user.findMany({
      where: { activo: true, rol: { not: "SUPERADMIN" } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.cliente.findMany({
      where: { estado: "ACTIVO", ...filtroClientesPorRol(user.rol) },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    juridicoActivo
      ? prisma.expediente.findMany({
          where: { ...filtroExpedientesPorRol(user.rol) },
          orderBy: { titulo: "asc" },
          select: { id: true, titulo: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Tareas"
        subtitulo={`${tareas.length} en ${formatPeriodo(mes)}`}
        acciones={<MesSelector mes={mes} />}
      />
      <TareasBoard
        tareas={JSON.parse(JSON.stringify(tareas))}
        usuarios={usuarios}
        clientes={clientes}
        expedientes={expedientes}
        miUserId={user.id}
        tareaIdInicial={sp.tarea}
      />
    </div>
  );
}
