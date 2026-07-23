import Link from "next/link";
import { EstadoCliente, Prisma, TipoCliente } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { TIPO_CLIENTE_LABELS, ESTADO_CLIENTE_LABELS, ESTADO_FISCAL_LABELS } from "@/lib/clientes";
import { TIPO_CLIENTE, ESTADO_CLIENTE, ESTADO_FISCAL } from "@/lib/badges";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TRow, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { ClientesFiltros } from "./ClientesFiltros";

export const metadata = { title: "Clientes — ArandúSoft" };

interface Props {
  searchParams: Promise<{ q?: string; tipo?: string; estado?: string }>;
}

export default async function ClientesPage({ searchParams }: Props) {
  const session = await auth();
  const user = session!.user;
  const sp = await searchParams;

  const tipo = Object.values(TipoCliente).includes(sp.tipo as TipoCliente)
    ? (sp.tipo as TipoCliente)
    : undefined;
  const estado = Object.values(EstadoCliente).includes(sp.estado as EstadoCliente)
    ? (sp.estado as EstadoCliente)
    : undefined;

  const where: Prisma.ClienteWhereInput = {
    ...filtroClientesPorRol(user.rol),
    ...(tipo ? { tipo } : {}),
    ...(estado ? { estado } : {}),
    ...(sp.q
      ? {
          OR: [
            { nombre: { contains: sp.q, mode: "insensitive" } },
            { ruc: { contains: sp.q } },
          ],
        }
      : {}),
  };

  const clientes = await prisma.cliente.findMany({
    where,
    orderBy: { nombre: "asc" },
    take: 200,
    select: {
      id: true,
      nombre: true,
      ruc: true,
      tipo: true,
      estado: true,
      estadoFiscal: true,
      responsable: { select: { nombre: true } },
    },
  });

  return (
    <div>
      <PageHeader
        titulo="Clientes"
        subtitulo={`${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`}
        acciones={
          <>
            {user.rol === "ADMIN" && (
              <Link href="/clientes/importar">
                <Button variant="outline">Importar</Button>
              </Link>
            )}
            <Link href="/clientes/nuevo">
              <Button>+ Nuevo cliente</Button>
            </Link>
          </>
        }
      />

      <ClientesFiltros mostrarTipos={user.rol === "ADMIN"} />

      {clientes.length === 0 ? (
        <div className="bg-white rounded-card border border-line mt-4">
          <EmptyState
            titulo="Sin clientes"
            descripcion="No se encontraron clientes con los filtros aplicados."
            accion={
              <Link href="/clientes/nuevo">
                <Button variant="outline">Crear el primero</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <Table className="mt-4">
          <THead>
            <TH>Cliente</TH>
            <TH>RUC / CI</TH>
            <TH>Tipo</TH>
            <TH>Estado</TH>
            <TH>Estado fiscal</TH>
            <TH>Responsable</TH>
          </THead>
          <tbody>
            {clientes.map((c) => (
              <TRow key={c.id}>
                <TD>
                  <Link
                    href={`/clientes/${c.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {c.nombre}
                  </Link>
                </TD>
                <TD className="text-ink-muted">{c.ruc}</TD>
                <TD>
                  <Badge style={TIPO_CLIENTE[c.tipo]}>
                    {TIPO_CLIENTE_LABELS[c.tipo]}
                  </Badge>
                </TD>
                <TD>
                  <Badge style={ESTADO_CLIENTE[c.estado]}>
                    {ESTADO_CLIENTE_LABELS[c.estado]}
                  </Badge>
                </TD>
                <TD>
                  <Badge style={ESTADO_FISCAL[c.estadoFiscal]}>
                    {ESTADO_FISCAL_LABELS[c.estadoFiscal]}
                  </Badge>
                </TD>
                <TD>
                  <span className="flex items-center gap-2">
                    <Avatar nombre={c.responsable.nombre} size="sm" />
                    <span className="text-ink-muted">{c.responsable.nombre}</span>
                  </span>
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
