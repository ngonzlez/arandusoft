import { redirect } from "next/navigation";
import { EstadoExpediente, Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol, filtroExpedientesPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpedientesLista } from "@/components/expedientes/ExpedientesLista";
import { ExpedientesFiltros } from "./ExpedientesFiltros";

export const metadata = { title: "Expedientes — ArandúSoft" };

interface Props {
  searchParams: Promise<{ q?: string; anio?: string; estado?: string; desde?: string; hasta?: string }>;
}

export default async function ExpedientesPage({ searchParams }: Props) {
  const session = await auth();
  const user = session!.user;
  const sp = await searchParams;

  const juridicoActivo = await tieneFeature("juridico");
  if (!juridicoActivo) redirect("/dashboard");

  const anio = sp.anio ? Number(sp.anio) : undefined;
  const estado = Object.values(EstadoExpediente).includes(sp.estado as EstadoExpediente)
    ? (sp.estado as EstadoExpediente)
    : undefined;

  const filtroRol = filtroExpedientesPorRol(user.rol);

  // Rango de fechas → filtra expedientes con movimiento (actuación) en el
  // período, igual que la búsqueda de "movimientos" de CSJ.
  const desde = sp.desde ? new Date(`${sp.desde}T00:00:00`) : undefined;
  const hasta = sp.hasta ? new Date(`${sp.hasta}T23:59:59`) : undefined;
  const filtroFecha =
    desde || hasta
      ? {
          actuaciones: {
            some: {
              fecha: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            },
          },
        }
      : {};

  const where: Prisma.ExpedienteWhereInput = {
    ...filtroRol,
    ...(anio ? { anio } : {}),
    ...(estado ? { estado } : {}),
    ...filtroFecha,
    ...(sp.q
      ? {
          OR: [
            { titulo: { contains: sp.q, mode: "insensitive" } },
            { numero: { contains: sp.q, mode: "insensitive" } },
            { caratula: { contains: sp.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [expedientes, usuarios, clientes, departamentos, juzgados, aniosDistintos] = await Promise.all([
    prisma.expediente.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        cliente: { select: { id: true, nombre: true } },
        juzgado: { select: { id: true, nombre: true } },
        responsable: { select: { id: true, nombre: true } },
        _count: { select: { documentos: true, tareas: true } },
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
    prisma.departamento.findMany({
      orderBy: { nombre: "asc" },
      include: { ciudades: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true } } },
    }),
    prisma.juzgado.findMany({
      where: { activo: true },
      orderBy: [{ circunscripcion: "asc" }, { nombre: "asc" }],
      include: { secretarias: { where: { activo: true }, orderBy: { nombre: "asc" } } },
    }),
    prisma.expediente.findMany({
      where: { ...filtroRol, anio: { not: null } },
      distinct: ["anio"],
      orderBy: { anio: "desc" },
      select: { anio: true },
    }),
  ]);

  return (
    <div>
      <PageHeader titulo="Expedientes" subtitulo={`${expedientes.length} en total`} />
      <div className="mb-4">
        <ExpedientesFiltros anios={aniosDistintos.map((a) => a.anio!).filter(Boolean)} />
      </div>
      <ExpedientesLista
        expedientes={JSON.parse(JSON.stringify(expedientes))}
        usuarios={usuarios}
        clientes={clientes}
        departamentos={JSON.parse(JSON.stringify(departamentos))}
        juzgados={JSON.parse(JSON.stringify(juzgados))}
        miUserId={user.id}
      />
    </div>
  );
}
