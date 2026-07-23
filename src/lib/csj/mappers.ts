import type {
  CsjActuacion,
  CsjCasoDetalle,
  CsjCasoListado,
  CsjInterviniente,
  CsjMovimiento,
  CsjParte,
} from "./types";
import { instanciaCsj } from "./client";

// Normalización de respuestas CSJ a formas listas para persistir. Puro: sin
// llamadas a Prisma. La resolución de relaciones (materia/circunscripción →
// catálogo local) la hace el servicio de importación.

export interface DatosCasoCsj {
  csjCasoId: string;
  csjInstancia: string;
  caratula: string;
  numero: number | null;
  anio: number | null;
  materiaNombre: string | null;
  circunscripcionNombre: string | null;
  despacho: string | null;
}

export function mapCaso(listado: CsjCasoListado, detalle?: CsjCasoDetalle): DatosCasoCsj {
  return {
    csjCasoId: String(listado.codCasoJudicial),
    csjInstancia: instanciaCsj(listado.origen, listado.esCorte),
    caratula: detalle?.caratula ?? listado.caratula,
    numero: detalle?.nroExpedienteNumero ?? listado.nroExpedienteNumero ?? null,
    anio: detalle?.nroExpedienteAnio ?? listado.nroExpedienteAnio ?? null,
    materiaNombre: detalle?.materia?.trim() || null,
    circunscripcionNombre:
      detalle?.circunscripcion?.trim() || listado.descripcionCircunscripcion?.trim() || null,
    despacho: listado.descripcionDespacho?.trim() || null,
  };
}

export interface DatosActuacionCsj {
  csjId: string;
  grupoProceso: string | null;
  procesoJudicial: string | null;
  descripcion: string;
  tipo: string | null;
  estado: string | null;
  despacho: string | null;
  fecha: Date | null;
}

export function mapActuacion(a: CsjActuacion): DatosActuacionCsj {
  return {
    csjId: String(a.codActuacionCaso),
    grupoProceso: a.grupo?.trim() || null,
    procesoJudicial: a.descripcionProcesoCaso?.trim() || null,
    descripcion: a.descripcionActuacion,
    tipo: a.descripcionTipoActuacion?.trim() || null,
    estado: a.estado?.trim() || null,
    despacho: a.descripcionDespacho?.trim() || null,
    fecha: a.fechaActuacion ? new Date(a.fechaActuacion) : null,
  };
}

export interface DatosIntervinienteCsj {
  instancia: string | null;
  tipoParte: string | null;
  nombre: string;
  tipoDocumento: string | null;
  nroDocumento: string | null;
}

export function mapInterviniente(
  i: CsjInterviniente,
  instancia?: string
): DatosIntervinienteCsj {
  return {
    instancia: instancia ?? null,
    tipoParte: i.descripcionTipoParte ?? i.tipoParte ?? null,
    nombre: i.nombreRazonSocial ?? i.nombre ?? "",
    tipoDocumento: i.descripcionTipoDocumento ?? i.tipoDocumento ?? null,
    nroDocumento: i.numeroDocumento ?? i.nroDocumento ?? null,
  };
}

// Parte del caso (Demandante/Demandado). Arma el nombre de las partes del
// nombre/apellidos (físicas) o razón social (jurídicas).
export function mapParte(p: CsjParte, instancia?: string): DatosIntervinienteCsj {
  const esJuridica = p.tipoPersona === "J";
  const nombrePersona = [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
    .filter(Boolean)
    .join(" ")
    .trim();
  const nombre = (esJuridica ? p.razonSocial : nombrePersona) || p.razonSocial || nombrePersona || "(sin nombre)";
  return {
    instancia: instancia ?? null,
    tipoParte: p.descripcionTipoParte ?? null,
    nombre,
    tipoDocumento: p.descripcionTipoDocumento ?? null,
    nroDocumento: p.nroDocumento ?? null,
  };
}

export interface DatosMovimientoCsj {
  despacho: string;
  estado: string | null;
  instancia: string | null;
  fechaIngreso: Date | null;
  fechaFin: Date | null;
}

export function mapMovimiento(m: CsjMovimiento): DatosMovimientoCsj {
  return {
    despacho: m.descripcionDespachoJudicial,
    estado: m.descripcionEstadoDespacho?.trim() || null,
    instancia: m.codInstancia != null ? String(m.codInstancia) : null,
    fechaIngreso: m.fechaIngresoDespachoCaso ? new Date(m.fechaIngresoDespachoCaso) : null,
    fechaFin: m.fechaFinDespachoCaso ? new Date(m.fechaFinDespachoCaso) : null,
  };
}
