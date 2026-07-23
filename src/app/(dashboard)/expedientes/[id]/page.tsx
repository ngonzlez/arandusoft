import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroExpedientesPorRol } from "@/lib/api-auth";
import { tieneFeature } from "@/lib/licencia";
import { TIPO_EXPEDIENTE_LABELS, ESTADO_EXPEDIENTE_LABELS, formatNumeroExpediente } from "@/lib/expedientes";
import { ESTADO_TAREA } from "@/lib/badges";
import { formatFecha, formatFechaHora } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, THead, TH, TRow, TD } from "@/components/ui/Table";
import { ClienteTabs } from "@/components/clientes/ClienteTabs";
import { NotasPanel } from "@/components/shared/NotasPanel";
import { DocumentosExpediente } from "@/components/expedientes/DocumentosExpediente";
import { ActuacionesTabla } from "@/components/expedientes/ActuacionesTabla";
import { EstadoExpedienteControl } from "@/components/expedientes/EstadoExpedienteControl";
import { FechaLimiteControl } from "@/components/expedientes/FechaLimiteControl";
import { PlazoControl } from "@/components/expedientes/PlazoControl";
import { CompartirReporte } from "@/components/expedientes/CompartirReporte";

export const metadata = { title: "Expediente — ArandúSoft" };

export default async function ExpedienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const { id } = await params;

  const juridicoActivo = await tieneFeature("juridico");
  if (!juridicoActivo) redirect("/dashboard");

  const expediente = await prisma.expediente.findFirst({
    where: { id, ...filtroExpedientesPorRol(user.rol) },
    include: {
      cliente: { select: { id: true, nombre: true, ruc: true } },
      ciudad: { select: { id: true, nombre: true, departamento: { select: { nombre: true } } } },
      juzgado: { select: { id: true, nombre: true, circunscripcion: true } },
      secretaria: { select: { id: true, nombre: true } },
      responsable: { select: { id: true, nombre: true } },
      materia: { select: { nombre: true } },
      circunscripcion: { select: { nombre: true } },
      actuaciones: { orderBy: { fecha: "desc" } },
      intervinientes: { orderBy: { createdAt: "asc" } },
      movimientos: { orderBy: { fechaIngreso: "desc" } },
      documentos: {
        orderBy: { createdAt: "desc" },
        include: { subidor: { select: { nombre: true } } },
      },
      historial: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { nombre: true } } },
      },
      tareas: {
        orderBy: [{ estado: "asc" }, { fechaLimite: "asc" }],
        select: {
          id: true,
          titulo: true,
          estado: true,
          fechaLimite: true,
          responsable: { select: { nombre: true } },
        },
      },
    },
  });
  if (!expediente) notFound();

  // Marca las actuaciones como revisadas (sale de "actuación nueva" en la cartera).
  if (expediente.origenCsj) {
    await prisma.expediente
      .update({ where: { id: expediente.id }, data: { actuacionesRevisadasAt: new Date() } })
      .catch(() => {});
  }

  const resumen = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <h3 className="font-heading font-semibold text-primary mb-4">Datos del expediente</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Cliente</dt>
            <dd className="text-ink-base font-medium">
              {expediente.cliente ? (
                <Link href={`/clientes/${expediente.cliente.id}`} className="hover:underline">
                  {expediente.cliente.nombre}
                </Link>
              ) : (
                <span className="text-ink-faint">Sin cliente asociado</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">N° / Año</dt>
            <dd className="text-ink-base font-medium font-mono">
              {formatNumeroExpediente(expediente.numero, expediente.anio)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Tipo</dt>
            <dd className="text-ink-base font-medium">{TIPO_EXPEDIENTE_LABELS[expediente.tipo]}</dd>
          </div>
          {expediente.materia && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Materia</dt>
              <dd className="text-ink-base font-medium">{expediente.materia.nombre}</dd>
            </div>
          )}
          {expediente.circunscripcion && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Circunscripción</dt>
              <dd className="text-ink-base font-medium">{expediente.circunscripcion.nombre}</dd>
            </div>
          )}
          {expediente.proceso && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Proceso</dt>
              <dd className="text-ink-base font-medium">{expediente.proceso}</dd>
            </div>
          )}
          {expediente.fase && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Fase</dt>
              <dd className="text-ink-base font-medium text-right">{expediente.fase}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Juzgado</dt>
            <dd className="text-ink-base font-medium text-right">
              {expediente.juzgado ? (
                <>
                  {expediente.juzgado.nombre}
                  {expediente.secretaria && (
                    <span className="block text-xs text-ink-muted font-normal">{expediente.secretaria.nombre}</span>
                  )}
                </>
              ) : expediente.despachoCsj ? (
                expediente.despachoCsj
              ) : (
                <span className="text-ink-faint">Sin especificar</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Departamento / Ciudad</dt>
            <dd className="text-ink-base font-medium">
              {expediente.ciudad ? (
                `${expediente.ciudad.nombre} (${expediente.ciudad.departamento.nombre})`
              ) : (
                <span className="text-ink-faint">Sin especificar</span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Fecha de inicio</dt>
            <dd className="text-ink-base font-medium">{formatFecha(expediente.fechaInicio)}</dd>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-ink-muted">Fecha límite</dt>
            <dd>
              <FechaLimiteControl
                expedienteId={expediente.id}
                fechaLimite={expediente.fechaLimite?.toISOString() ?? null}
              />
            </dd>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-ink-muted">Responsable</dt>
            <dd className="flex items-center gap-2">
              <Avatar nombre={expediente.responsable.nombre} size="sm" />
              <span className="font-medium">{expediente.responsable.nombre}</span>
            </dd>
          </div>
        </dl>
        <p className="text-xs text-ink-faint mt-4 pt-4 border-t border-line">
          El seguimiento oficial de plazos procesales y número de causa se lleva en Judisoft.
          Este expediente es el seguimiento interno del estudio (documentos, notas y tareas).
        </p>
      </Card>

      <Card>
        <h3 className="font-heading font-semibold text-primary mb-4">Historial de estado</h3>
        {expediente.historial.length === 0 ? (
          <p className="text-sm text-ink-faint">Sin cambios registrados.</p>
        ) : (
          <ul className="space-y-3">
            {expediente.historial.map((h) => (
              <li key={h.id} className="text-sm">
                <p className="text-ink-base">
                  {h.estadoAnterior ? (
                    <>
                      {ESTADO_EXPEDIENTE_LABELS[h.estadoAnterior]} →{" "}
                      <strong>{ESTADO_EXPEDIENTE_LABELS[h.estadoNuevo]}</strong>
                    </>
                  ) : (
                    <strong>{h.comentario ?? "Creado"}</strong>
                  )}
                </p>
                <p className="text-xs text-ink-faint">
                  {h.user.nombre} · {formatFechaHora(h.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );

  const esCsj = expediente.origenCsj || expediente.actuaciones.length > 0;

  const actuacionesTab = (
    <Card>
      <ActuacionesTabla
        casoId={expediente.csjCasoId}
        instancia={expediente.csjInstancia}
        actuaciones={expediente.actuaciones.map((a) => ({
          id: a.id,
          csjId: a.csjId,
          grupoProceso: a.grupoProceso,
          procesoJudicial: a.procesoJudicial,
          descripcion: a.descripcion,
          tipo: a.tipo,
          estado: a.estado,
          despacho: a.despacho,
          fecha: a.fecha ? a.fecha.toISOString() : null,
          documentos: Array.isArray(a.documentos)
            ? (a.documentos as { idDocumento: number; descripcion: string }[])
            : [],
        }))}
      />
    </Card>
  );

  const movimientosTab = (
    <Card>
      {expediente.movimientos.length === 0 ? (
        <p className="text-sm text-ink-faint">Sin movimientos importados.</p>
      ) : (
        <Table>
          <THead>
            <TH>Despacho</TH>
            <TH>Estado</TH>
            <TH>Ingreso</TH>
            <TH>Egreso</TH>
          </THead>
          <tbody>
            {expediente.movimientos.map((m) => (
              <TRow key={m.id}>
                <TD className="font-medium">{m.despacho}</TD>
                <TD className="text-ink-muted">{m.estado ?? "—"}</TD>
                <TD className="whitespace-nowrap text-ink-muted">
                  {m.fechaIngreso ? formatFecha(m.fechaIngreso) : "—"}
                </TD>
                <TD className="whitespace-nowrap text-ink-muted">
                  {m.fechaFin ? formatFecha(m.fechaFin) : "—"}
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );

  const partesTab = (
    <Card>
      {expediente.intervinientes.length === 0 ? (
        <p className="text-sm text-ink-faint">Sin partes registradas en CSJ para este expediente.</p>
      ) : (
        <Table>
          <THead>
            <TH>Tipo de parte</TH>
            <TH>Nombre / Razón social</TH>
            <TH>Documento</TH>
          </THead>
          <tbody>
            {expediente.intervinientes.map((i) => (
              <TRow key={i.id}>
                <TD className="text-ink-muted">{i.tipoParte ?? "—"}</TD>
                <TD className="font-medium">{i.nombre}</TD>
                <TD className="text-ink-muted">
                  {[i.tipoDocumento, i.nroDocumento].filter(Boolean).join(" ") || "—"}
                </TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="font-heading text-lg font-bold text-primary leading-tight">
            {expediente.titulo}
          </h1>
          <p className="text-xs text-ink-muted mt-1 font-mono">
            {formatNumeroExpediente(expediente.numero, expediente.anio)}
            {expediente.cliente?.ruc && ` · ${expediente.cliente.ruc}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PlazoControl expedienteId={expediente.id} />
          <CompartirReporte expedienteId={expediente.id} />
          <EstadoExpedienteControl expedienteId={expediente.id} estadoActual={expediente.estado} />
          <Link href="/expedientes">
            <Button variant="outline">Volver</Button>
          </Link>
        </div>
      </div>

      <ClienteTabs
        tabs={[
          { key: "resumen", label: "Resumen", content: resumen },
          {
            key: "documentos",
            label: `Documentos (${expediente.documentos.length})`,
            content: (
              <Card>
                <DocumentosExpediente
                  expedienteId={expediente.id}
                  documentos={JSON.parse(JSON.stringify(expediente.documentos))}
                />
              </Card>
            ),
          },
          {
            key: "notas",
            label: "Observaciones",
            content: (
              <Card>
                <NotasPanel
                  endpoint={`/api/expedientes/${expediente.id}/notas`}
                  placeholder="Ej: audiencia reprogramada, cliente entregó tal documento..."
                />
              </Card>
            ),
          },
          {
            key: "tareas",
            label: `Tareas (${expediente.tareas.length})`,
            content:
              expediente.tareas.length === 0 ? (
                <Card>
                  <p className="text-sm text-ink-faint">
                    Sin tareas vinculadas. Creálas desde el módulo Tareas eligiendo este
                    expediente.
                  </p>
                </Card>
              ) : (
                <Card>
                  <ul className="divide-y divide-line/60">
                    {expediente.tareas.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="flex-1 font-medium text-primary">{t.titulo}</span>
                        <Badge style={ESTADO_TAREA[t.estado]}>{t.estado.replace("_", " ")}</Badge>
                        {t.fechaLimite && (
                          <span className="text-xs text-ink-muted w-20">
                            {formatFecha(t.fechaLimite)}
                          </span>
                        )}
                        <Avatar nombre={t.responsable.nombre} size="sm" />
                      </li>
                    ))}
                  </ul>
                </Card>
              ),
          },
          ...(esCsj
            ? [
                {
                  key: "actuaciones",
                  label: `Actuaciones (${expediente.actuaciones.length})`,
                  content: actuacionesTab,
                },
                {
                  key: "partes",
                  label: `Partes (${expediente.intervinientes.length})`,
                  content: partesTab,
                },
                {
                  key: "movimientos",
                  label: `Movimientos (${expediente.movimientos.length})`,
                  content: movimientosTab,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
