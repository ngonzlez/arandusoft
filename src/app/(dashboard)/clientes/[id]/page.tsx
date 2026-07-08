import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { desencriptar } from "@/lib/crypto";
import {
  OBLIGACIONES_LABELS,
  TIPO_CLIENTE_LABELS,
  ESTADO_CLIENTE_LABELS,
  ESTADO_FISCAL_LABELS,
  type AccesosCliente,
} from "@/lib/clientes";
import { TIPO_CLIENTE, ESTADO_CLIENTE, ESTADO_FISCAL } from "@/lib/badges";
import { formatInTimeZone } from "date-fns-tz";
import { TZ_PARAGUAY } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ClienteTabs } from "@/components/clientes/ClienteTabs";
import { AccesosPanel } from "@/components/clientes/AccesosPanel";
import { EstadoMensualTabla } from "@/components/estado-mensual/EstadoMensualTabla";
import { DeclaracionesTab } from "@/components/declaraciones/DeclaracionesTab";
import { formatFecha } from "@/lib/format";
import { categoriaVencimiento, CATEGORIA_COLORES } from "@/lib/vencimientos";
import { ESTADO_VENCIMIENTO } from "@/lib/badges";

export const metadata = { title: "Cliente — ArandúSoft" };

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const { id } = await params;

  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");

  const cliente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientesPorRol(user.rol) },
    include: {
      responsable: { select: { nombre: true } },
      obligaciones: { where: { activa: true }, select: { tipo: true } },
      estadosMensuales: {
        where: { mes: mesActual },
        select: {
          obligacion: true,
          estado: true,
          fechaPresentacion: true,
          responsable: { select: { nombre: true } },
        },
      },
      vencimientos: {
        where: { fechaVencimiento: { gte: new Date() } },
        orderBy: { fechaVencimiento: "asc" },
        take: 15,
        select: { id: true, tipo: true, estado: true, fechaVencimiento: true },
      },
    },
  });
  if (!cliente) notFound();

  const esAdmin = user.rol === "ADMIN";
  let accesos: AccesosCliente | null = null;
  if (esAdmin && cliente.accesos) {
    try {
      accesos = JSON.parse(desencriptar(cliente.accesos));
    } catch {
      accesos = null;
    }
  }

  const resumen = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <h3 className="font-heading font-semibold text-primary mb-4">Datos de contacto</h3>
        <dl className="space-y-3 text-sm">
          {[
            ["RUC / CI", cliente.ruc],
            ["Cédula", cliente.cedula],
            ["Teléfono", cliente.telefono],
            ["Correo", cliente.email],
            ["Dirección", cliente.direccion],
          ].map(([label, valor]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="text-ink-base font-medium text-right">{valor || "—"}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-ink-muted">Responsable</dt>
            <dd className="flex items-center gap-2">
              <Avatar nombre={cliente.responsable.nombre} size="sm" />
              <span className="font-medium">{cliente.responsable.nombre}</span>
            </dd>
          </div>
        </dl>
      </Card>

      <div className="space-y-4">
        <Card>
          <h3 className="font-heading font-semibold text-primary mb-4">Obligaciones activas</h3>
          {cliente.obligaciones.length === 0 ? (
            <p className="text-sm text-ink-faint">Sin obligaciones configuradas.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cliente.obligaciones.map((o) => (
                <span
                  key={o.tipo}
                  className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-primary"
                >
                  {OBLIGACIONES_LABELS[o.tipo]}
                </span>
              ))}
            </div>
          )}
        </Card>

        {esAdmin && <AccesosPanel accesos={accesos} />}
      </div>
    </div>
  );

  const placeholder = (modulo: string, fase: string) => (
    <Card>
      <p className="text-sm text-ink-faint">
        {modulo} se habilita en la {fase}.
      </p>
    </Card>
  );

  return (
    <div>
      <PageHeader
        titulo={cliente.nombre}
        subtitulo={`RUC ${cliente.ruc}`}
        acciones={
          <Link href={`/clientes/${cliente.id}/editar`}>
            <Button variant="outline">Editar</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2 mb-5">
        <Badge style={TIPO_CLIENTE[cliente.tipo]}>{TIPO_CLIENTE_LABELS[cliente.tipo]}</Badge>
        <Badge style={ESTADO_CLIENTE[cliente.estado]}>{ESTADO_CLIENTE_LABELS[cliente.estado]}</Badge>
        <Badge style={ESTADO_FISCAL[cliente.estadoFiscal]}>{ESTADO_FISCAL_LABELS[cliente.estadoFiscal]}</Badge>
      </div>

      <ClienteTabs
        tabs={[
          { key: "resumen", label: "Resumen", content: resumen },
          {
            key: "estado-mensual",
            label: "Estado Mensual",
            content:
              user.rol === "JURIDICO" || cliente.obligaciones.length === 0 ? (
                <Card>
                  <p className="text-sm text-ink-faint">
                    {user.rol === "JURIDICO"
                      ? "El estado mensual es del área contable."
                      : "Este cliente no tiene obligaciones activas configuradas."}
                  </p>
                </Card>
              ) : (
                <EstadoMensualTabla
                  mes={mesActual}
                  clientes={[
                    {
                      id: cliente.id,
                      nombre: cliente.nombre,
                      ruc: cliente.ruc,
                      obligaciones: cliente.obligaciones,
                      estadosMensuales: cliente.estadosMensuales,
                    },
                  ]}
                />
              ),
          },
          {
            key: "declaraciones",
            label: "Declaraciones",
            content: (
              <DeclaracionesTab
                clienteId={cliente.id}
                clienteNombre={cliente.nombre}
                puedeSubir={user.rol === "ADMIN" || user.rol === "CONTABLE"}
              />
            ),
          },
          {
            key: "vencimientos",
            label: "Vencimientos",
            content:
              cliente.vencimientos.length === 0 ? (
                <Card>
                  <p className="text-sm text-ink-faint">
                    Sin vencimientos próximos. Los de IVA se generan automáticamente
                    al visitar el calendario del mes correspondiente.
                  </p>
                </Card>
              ) : (
                <Card>
                  <ul className="divide-y divide-line/60">
                    {cliente.vencimientos.map((v) => {
                      const cat = CATEGORIA_COLORES[categoriaVencimiento(v.tipo)];
                      return (
                        <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                          <span className="font-medium text-primary w-24 shrink-0">
                            {formatFecha(v.fechaVencimiento)}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
                            style={{ backgroundColor: cat.bg, color: cat.text }}
                          >
                            {v.tipo}
                          </span>
                          <span className="ml-auto">
                            <Badge style={ESTADO_VENCIMIENTO[v.estado]}>{v.estado}</Badge>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ),
          },
          { key: "tareas", label: "Tareas", content: placeholder("Las tareas", "Fase 8") },
        ]}
      />
    </div>
  );
}
