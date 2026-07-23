// Tipos de las respuestas del portal CSJ (apps.csj.gov.py/api/gestion-partes).
// Derivados de respuestas reales capturadas en el spike (scripts/csj-probe.ts).
// API NO oficial: los campos pueden cambiar sin aviso.

// ── Autenticación ──────────────────────────────────────────────────────────
// POST /autenticador/login  body { usuario, clave, temporal:false }
export interface CsjParTokens {
  bearerToken: string;
  refreshToken: string;
  timestampExpiracionUtc: string; // ISO — TTL ~1h
}

export interface CsjRol {
  rolId: number; // se manda como header `usuario-rol` en cada request a la API
  descripcionRol?: string; // ej: "Abogados"
  circunscripciones?: { circunscripcionId: number; descripcionCircunscripcion: string }[];
}

export interface CsjAplicacion {
  appId: number;
  roles: CsjRol[];
}

export interface CsjDatosUsuario {
  nombreUsuario: string; // "DELGADO VERA, APARICIO"
  numeroDocumento: string;
  codigoUsuario: string;
  aplicaciones: CsjAplicacion[];
}

export interface CsjLoginResponse {
  parTokens: CsjParTokens;
  datosUsuario: CsjDatosUsuario;
}

// ── Catálogos ────────────────────────────────────────────────────────────
// GET /Materias  /Circunscripciones  /TiposGrupoProceso
export interface CsjCatalogoItem {
  codigo: number;
  descripcion: string;
}
export interface CsjCatalogoResponse {
  resultado: CsjCatalogoItem[];
}

// ── Casos (lista) ──────────────────────────────────────────────────────────
// GET /CasoJudicial/UltimosDiezDias  y  /CasoJudicial?caratula=
export interface CsjCasoListado {
  codCasoJudicial: number; // id CSJ del caso
  origen: number; // parte de la notación de instancia
  esCorte: number; // parte de la notación de instancia → `${origen}:${esCorte}`
  caratula: string;
  nroExpedienteNumero: number;
  nroExpedienteAnio: number;
  descripcionCircunscripcion?: string;
  descripcionDespacho?: string;
  fechaActualizacion?: string;
}
export interface CsjCasoListadoResponse {
  resultado: CsjCasoListado[];
  offset?: number;
  cantidadSolicitada?: number;
  cantidadTotalRegistros?: number;
}

// ── Caso (detalle) ─────────────────────────────────────────────────────────
// GET /CasoJudicial/{id}/{instancia}/
export interface CsjCasoDetalle {
  caratula: string;
  circunscripcion?: string; // nombre, no id
  materia?: string; // nombre, no id
  nroExpedienteNumero: number;
  nroExpedienteAnio: number;
}

// ── Actuaciones ────────────────────────────────────────────────────────────
// GET /CasoJudicial/{id}/{instancia}/actuaciones/
export interface CsjActuacion {
  codActuacionCaso: number; // id de la actuación (para dedupe)
  codCasoJudicial: number;
  codDespachoJudicial?: number;
  codTipoActuacionGlobal?: number;
  codTipoGrupoProceso?: number;
  descripcionActuacion: string;
  descripcionDespacho?: string;
  descripcionProcesoCaso?: string;
  descripcionTipoActuacion?: string;
  grupo?: string; // "Principal" / "Recursos" / "R.H.P." / "Excepciones" / "Incidentes"
  estado?: string; // "Finalizado"
  esCorte: number;
  origen: number;
  fechaActuacion?: string;
  fechaFinalizacion?: string | null;
  numero?: number | null;
}

// ── Intervinientes / partes ──────────────────────────────────────────────────
// GET /CasoJudicial/{id}/{instancia}/instancias/{n}/intervinientes/
// Shape aún sin confirmar (samples vacíos); campos opcionales tolerantes.
export interface CsjInterviniente {
  tipoParte?: string;
  descripcionTipoParte?: string;
  nombre?: string;
  nombreRazonSocial?: string;
  tipoDocumento?: string;
  descripcionTipoDocumento?: string;
  nroDocumento?: string;
  numeroDocumento?: string;
}
export interface CsjIntervinientesResponse {
  resultado: CsjInterviniente[];
  cantidadTotalRegistros?: number;
}

// ── Partes del caso ──────────────────────────────────────────────────────────
// GET /CasoJudicial/{id}/{inst}/instancias/{n}/partes/
export interface CsjParte {
  codParteCaso: number;
  descripcionTipoParte?: string; // Demandante / Demandado
  tipoPersona?: string; // "F" física / "J" jurídica
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  razonSocial?: string;
  descripcionTipoDocumento?: string;
  nroDocumento?: string;
}
export interface CsjPartesResponse {
  resultado: CsjParte[];
}

// ── Movimientos del caso (pases entre despachos) ─────────────────────────────
// GET /CasoJudicial/{id}/{inst}/movimientos/
export interface CsjMovimiento {
  codDespachoJudicial?: number;
  codInstancia?: number;
  descripcionDespachoJudicial: string;
  descripcionEstadoDespacho?: string; // Activo / Transferido / Finalizado
  fechaIngresoDespachoCaso?: string;
  fechaFinDespachoCaso?: string | null;
}
export interface CsjMovimientosResponse {
  resultado: CsjMovimiento[];
}

// ── Otros datos del caso ─────────────────────────────────────────────────────
// GET /CasoJudicial/{id}/{inst}/otros-datos  → { primeraInstancia: {...} }
export interface CsjOtrosDatos {
  primeraInstancia?: {
    proceso?: string;
    fase?: string;
    monto?: string;
    descripcionMateria?: string;
    descripcionCircunscripcion?: string;
    descripcionDespachoJudicial?: string;
    fechaRegistro?: string;
    caratula?: string;
  };
}

// ── Notificaciones electrónicas (cédulas por recibir) ────────────────────────
// GET /api/gestion-partes/Notificaciones/PorRecibir
export interface CsjNotificacion {
  codNotificacionOrigen: number;
  codCasoJudicial: number;
  codActuacionCaso?: number;
  origen?: number;
  esCorte?: number;
  caratula?: string;
  descripcionDespacho?: string;
  descripcionProceso?: string;
  descripcionProcesoCaso?: string;
  descripcionTipoActuacion?: string;
  descripcionCircunscripcion?: string;
  fechaNotificacion?: string;
  fechaRevision?: string | null;
  revisado?: boolean | null;
}
export interface CsjNotificacionesResponse {
  resultado: CsjNotificacion[];
}

// ── Documentos (PDF) de una actuación ────────────────────────────────────────
// GET /CasoJudicial/{id}/{inst}/actuaciones/{cod}:{inst}/documentos/  → lista
// GET .../documentos/{idDocumento}  → PDF binario (application/pdf)
export interface CsjDocumento {
  idDocumento: number;
  descripcion: string;
  codActuacionCaso?: number;
  origen?: number;
  esCorte?: number;
}
export interface CsjDocumentosResponse {
  resultado: CsjDocumento[];
}
