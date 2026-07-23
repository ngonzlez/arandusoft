import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroClientesPorRol } from "@/lib/api-auth";
import { desencriptar } from "@/lib/crypto";
import {
  OBLIGACIONES_LABELS,
  TIPO_CLIENTE_LABELS,
  ESTADO_FISCAL_LABELS,
  type AccesosCliente,
} from "@/lib/clientes";
import { TIPO_CLIENTE, ESTADO_FISCAL } from "@/lib/badges";
import { formatInTimeZone } from "date-fns-tz";
import { TZ_PARAGUAY } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ClienteTabs } from "@/components/clientes/ClienteTabs";
import { AccesosPanel } from "@/components/clientes/AccesosPanel";
import { EstadoMensualTabla } from "@/components/estado-mensual/EstadoMensualTabla";
import { DeclaracionesTab } from "@/components/declaraciones/DeclaracionesTab";
import { formatFecha } from "@/lib/format";
import { TIPO_VENCIMIENTO_META, etiquetaVencimiento, generarVencimientosClienteDelMes } from "@/lib/vencimientos";
import { colorUrgencia } from "@/lib/vencimientos-ui";
import { ESTADO_VENCIMIENTO, ESTADO_TAREA } from "@/lib/badges";
import { sincronizarVencidosEstadoMensual, mapaFechasVencimiento } from "@/lib/estado-mensual";

export const metadata = { title: "Cliente — ArandúSoft" };

const ICONO_FORMATO: Record<string, string> = { pdf: "📄", xlsx: "📊" };

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const { id } = await params;

  const mesActual = formatInTimeZone(new Date(), TZ_PARAGUAY, "yyyy-MM");
  const [añoActual, mesNumActual] = mesActual.split("-").map(Number);

  const clientePreObligaciones = await prisma.cliente.findFirst({
    where: { id, ...filtroClientesPorRol(user.rol) },
    select: {
      id: true,
      ruc: true,
      obligaciones: { where: { activa: true }, select: { tipo: true, diaVencimiento: true } },
    },
  });
  if (clientePreObligaciones) {
    // Genera este mes y el siguiente para que "Próximo vencimiento" esté
    // siempre al día, sin depender de haber visitado el Calendario antes.
    // Las 3 llamadas escriben en tablas disjuntas (EstadoMensual/
    // Cliente.estadoFiscal vs Vencimiento) — seguras en paralelo.
    const sigMes = mesNumActual === 12 ? 1 : mesNumActual + 1;
    const sigAño = mesNumActual === 12 ? añoActual + 1 : añoActual;
    await Promise.all([
      sincronizarVencidosEstadoMensual([clientePreObligaciones], mesActual),
      generarVencimientosClienteDelMes(id, añoActual, mesNumActual),
      generarVencimientosClienteDelMes(id, sigAño, sigMes),
    ]);
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id, ...filtroClientesPorRol(user.rol) },
    include: {
      responsable: { select: { nombre: true } },
      obligaciones: { where: { activa: true }, select: { tipo: true, diaVencimiento: true } },
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
        select: { id: true, tipo: true, descripcion: true, estado: true, fechaVencimiento: true },
      },
      declaraciones: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { tipo: true, periodo: true, fechaPresentacion: true, archivoFormato: true },
      },
      tareas: {
        orderBy: [{ estado: "asc" }, { fechaLimite: "asc" }],
        take: 20,
        select: {
          id: true,
          titulo: true,
          estado: true,
          prioridad: true,
          fechaLimite: true,
          responsable: { select: { nombre: true } },
        },
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

  const ultimaDeclaracion = cliente.declaraciones[0] ?? null;
  const proximoVencimiento = cliente.vencimientos[0] ?? null;

  const resumen = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="lg:col-span-2">
        <h3 className="font-heading font-semibold text-primary mb-4">Estado de cuenta</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-wide">Última declaración</p>
            {ultimaDeclaracion ? (
              <p className="text-sm font-medium text-ink-base mt-1">
                {ICONO_FORMATO[ultimaDeclaracion.archivoFormato] ?? "📄"}{" "}
                {OBLIGACIONES_LABELS[ultimaDeclaracion.tipo]} · {ultimaDeclaracion.periodo}
                <br />
                <span className="text-xs text-ink-faint font-normal">
                  {formatFecha(ultimaDeclaracion.fechaPresentacion)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-faint mt-1">Sin declaraciones cargadas</p>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-wide">Próximo vencimiento</p>
            {proximoVencimiento ? (
              <p className="text-sm font-medium text-ink-base mt-1">
                {proximoVencimiento.tipo}
                <br />
                <span className="text-xs text-ink-faint font-normal">
                  {formatFecha(proximoVencimiento.fechaVencimiento)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-faint mt-1">Ninguno próximo</p>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-wide">Observaciones</p>
            <p className="text-sm text-ink-base mt-1 whitespace-pre-wrap">
              {cliente.observaciones || <span className="text-ink-faint">Sin observaciones</span>}
            </p>
          </div>
        </div>
      </Card>

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

        <Card>
          <h3 className="font-heading font-semibold text-primary mb-4">Habilitación fiscal</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">N° de Timbrado</dt>
              <dd className="text-ink-base font-medium">{cliente.timbradoNumero || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Vence Timbrado</dt>
              <dd
                className="font-medium"
                style={{ color: cliente.timbradoVencimiento ? colorUrgencia(cliente.timbradoVencimiento) : undefined }}
              >
                {cliente.timbradoVencimiento ? formatFecha(cliente.timbradoVencimiento) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Vence Firma Digital</dt>
              <dd
                className="font-medium"
                style={{
                  color: cliente.firmaDigitalVencimiento ? colorUrgencia(cliente.firmaDigitalVencimiento) : undefined,
                }}
              >
                {cliente.firmaDigitalVencimiento ? formatFecha(cliente.firmaDigitalVencimiento) : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        {esAdmin && <AccesosPanel accesos={accesos} />}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-[15px]">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] font-heading text-lg font-semibold"
            style={{ backgroundColor: "#EAF0F8", color: "#22416E" }}
          >
            {cliente.nombre
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("")}
          </span>
          <div>
            <h1 className="font-heading text-lg font-bold text-primary leading-tight">
              {cliente.nombre}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge style={TIPO_CLIENTE[cliente.tipo]}>{TIPO_CLIENTE_LABELS[cliente.tipo]}</Badge>
              <Badge style={ESTADO_FISCAL[cliente.estadoFiscal]}>{ESTADO_FISCAL_LABELS[cliente.estadoFiscal]}</Badge>
              <span className="font-mono text-xs text-ink-muted">{cliente.ruc}</span>
            </div>
          </div>
        </div>
        <Link href={`/clientes/${cliente.id}/editar`}>
          <Button variant="outline">Editar</Button>
        </Link>
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
                      fechasVencimiento: mapaFechasVencimiento(
                        cliente.ruc,
                        cliente.obligaciones,
                        añoActual,
                        mesNumActual
                      ),
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
                      const cat = TIPO_VENCIMIENTO_META[v.tipo];
                      return (
                        <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                          <span className="font-medium text-primary w-24 shrink-0">
                            {formatFecha(v.fechaVencimiento)}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0"
                            style={{ backgroundColor: cat.bg, color: cat.text }}
                          >
                            {etiquetaVencimiento(v.tipo, v.descripcion)}
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
          {
            key: "tareas",
            label: "Tareas",
            content:
              cliente.tareas.length === 0 ? (
                <Card>
                  <p className="text-sm text-ink-faint">
                    Sin tareas vinculadas. Crealas desde el módulo Tareas eligiendo
                    este cliente.
                  </p>
                </Card>
              ) : (
                <Card>
                  <ul className="divide-y divide-line/60">
                    {cliente.tareas.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <Link
                          href={`/tareas?tarea=${t.id}`}
                          className="flex-1 font-medium text-primary hover:underline"
                        >
                          {t.titulo}
                        </Link>
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
        ]}
      />
    </div>
  );
}
