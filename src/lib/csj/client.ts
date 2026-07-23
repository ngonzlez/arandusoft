import "server-only";
import type {
  CsjActuacion,
  CsjCasoDetalle,
  CsjCasoListadoResponse,
  CsjCatalogoResponse,
  CsjDocumento,
  CsjDocumentosResponse,
  CsjIntervinientesResponse,
  CsjLoginResponse,
  CsjMovimientosResponse,
  CsjNotificacionesResponse,
  CsjOtrosDatos,
  CsjPartesResponse,
} from "./types";

// Cliente del portal CSJ (apps.csj.gov.py). Validado en el spike:
// - login server-side funciona (POST /autenticador/login → bearerToken, TTL ~1h)
// - la API de datos exige el header `usuario-rol` (rolId del login) además del Bearer;
//   sin él devuelve 403. Node fetch (HTTP/1.1) alcanza — no hay bloqueo por fingerprint.

const BASE = (process.env.CSJ_BASE_URL ?? "https://apps.csj.gov.py").replace(/\/$/, "");
const UA =
  process.env.CSJ_USER_AGENT ??
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
const TIMEOUT_MS = 25_000;
const MARGEN_EXPIRACION_MS = 60_000; // re-login 1 min antes de que expire

export class CsjError extends Error {
  constructor(
    public status: number,
    message: string,
    public detalle?: string
  ) {
    super(message);
    this.name = "CsjError";
  }
}

/** Notación de instancia que usa la API en la URL: `${origen}:${esCorte}`. */
export function instanciaCsj(origen: number, esCorte: number): string {
  return `${origen}:${esCorte}`;
}

async function fetchTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export class CsjClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private expiraEn = 0; // epoch ms
  private rolId: number | null = null;

  constructor(
    private readonly usuario: string,
    private readonly clave: string
  ) {}

  /** Datos del último login (nombre, doc, roles). Requiere login() previo. */
  private ultimoLogin: CsjLoginResponse | null = null;
  get datosUsuario() {
    return this.ultimoLogin?.datosUsuario ?? null;
  }
  get rol() {
    return this.rolId;
  }

  async login(): Promise<CsjLoginResponse> {
    const res = await fetchTimeout(`${BASE}/autenticador/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: BASE,
        Referer: `${BASE}/login`,
        "User-Agent": UA,
      },
      body: JSON.stringify({ usuario: this.usuario, clave: this.clave, temporal: false }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new CsjError(
        res.status,
        res.status === 401
          ? "Usuario o contraseña de CSJ incorrectos"
          : `Login CSJ falló (${res.status})`,
        txt.slice(0, 300)
      );
    }
    const data = (await res.json()) as CsjLoginResponse;
    this.ultimoLogin = data;
    this.token = data.parTokens.bearerToken;
    this.refreshToken = data.parTokens.refreshToken;
    this.expiraEn = new Date(data.parTokens.timestampExpiracionUtc).getTime();
    // rolId para el header `usuario-rol`. Tomamos el primer rol disponible
    // (típicamente "Abogados", rolId 16).
    this.rolId =
      data.datosUsuario.aplicaciones?.flatMap((a) => a.roles)?.[0]?.rolId ?? null;
    if (this.rolId == null) {
      throw new CsjError(403, "El usuario CSJ no tiene un rol asignado para consultar expedientes");
    }
    return data;
  }

  private async ensureAuth(): Promise<void> {
    if (!this.token || Date.now() > this.expiraEn - MARGEN_EXPIRACION_MS) {
      await this.login();
    }
  }

  private headers(): Record<string, string> {
    return {
      Accept: "application/json",
      Origin: BASE,
      Referer: `${BASE}/gestion-partes`,
      "User-Agent": UA,
      Authorization: `Bearer ${this.token}`,
      "usuario-rol": String(this.rolId ?? ""),
    };
  }

  /** GET a /api/gestion-partes con reintento único si el token fue rechazado. */
  private async apiGet<T>(path: string): Promise<T> {
    await this.ensureAuth();
    const url = `${BASE}/api/gestion-partes${path}`;
    let res = await fetchTimeout(url, { headers: this.headers() });
    if (res.status === 401 || res.status === 403) {
      // Token pudo expirar/invalidarse — re-login y reintento una vez.
      await this.login();
      res = await fetchTimeout(url, { headers: this.headers() });
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new CsjError(res.status, `CSJ GET ${path} falló (${res.status})`, txt.slice(0, 300));
    }
    return (await res.json()) as T;
  }

  // ── Catálogos ──────────────────────────────────────────────────────────
  getMaterias() {
    return this.apiGet<CsjCatalogoResponse>("/Materias?");
  }
  getCircunscripciones() {
    return this.apiGet<CsjCatalogoResponse>("/Circunscripciones?");
  }
  getTiposGrupoProceso() {
    return this.apiGet<CsjCatalogoResponse>("/TiposGrupoProceso?");
  }

  // ── Casos ────────────────────────────────────────────────────────────────
  getUltimosDiezDias(offset = 0, cantidad = 10) {
    return this.apiGet<CsjCasoListadoResponse>(
      `/CasoJudicial/UltimosDiezDias?offset=${offset}&cantidad=${cantidad}`
    );
  }
  buscarCasos(caratula: string, offset = 0, cantidad = 10) {
    return this.apiGet<CsjCasoListadoResponse>(
      `/CasoJudicial?offset=${offset}&cantidad=${cantidad}&caratula=${encodeURIComponent(caratula)}`
    );
  }
  getCasoDetalle(casoId: number, instancia: string) {
    return this.apiGet<CsjCasoDetalle>(`/CasoJudicial/${casoId}/${instancia}/`);
  }
  async getActuaciones(
    casoId: number,
    instancia: string,
    opts: { offset?: number; cantidad?: number; incluirNotificaciones?: boolean } = {}
  ): Promise<CsjActuacion[]> {
    const { offset = 0, cantidad = 50, incluirNotificaciones = true } = opts;
    const raw = await this.apiGet<CsjActuacion[] | { resultado?: CsjActuacion[] }>(
      `/CasoJudicial/${casoId}/${instancia}/actuaciones/?offset=${offset}&cantidad=${cantidad}&incluirNotificaciones=${incluirNotificaciones}`
    );
    // El endpoint devolvió un array plano en las muestras; toleramos { resultado }.
    return Array.isArray(raw) ? raw : (raw.resultado ?? []);
  }
  getIntervinientes(casoId: number, instancia: string, nroInstancia = 1) {
    return this.apiGet<CsjIntervinientesResponse>(
      `/CasoJudicial/${casoId}/${instancia}/instancias/${nroInstancia}/intervinientes/?offset=0&cantidad=50`
    );
  }

  /** Partes del caso (Demandante/Demandado) — la lista real de "Partes del caso". */
  async getPartes(casoId: number, instancia: string, nroInstancia = 1) {
    const r = await this.apiGet<CsjPartesResponse>(
      `/CasoJudicial/${casoId}/${instancia}/instancias/${nroInstancia}/partes/?offset=0&cantidad=50`
    );
    return r.resultado ?? [];
  }

  /** Movimientos del caso (pases entre despachos). */
  async getMovimientos(casoId: number, instancia: string) {
    const r = await this.apiGet<CsjMovimientosResponse>(
      `/CasoJudicial/${casoId}/${instancia}/movimientos/?offset=0&cantidad=50`
    );
    return r.resultado ?? [];
  }

  /** Otros datos del caso (proceso, fase, monto…). */
  getOtrosDatos(casoId: number, instancia: string) {
    return this.apiGet<CsjOtrosDatos>(`/CasoJudicial/${casoId}/${instancia}/otros-datos`);
  }

  /** Notificaciones electrónicas (cédulas) por recibir del abogado. */
  async getNotificacionesPorRecibir(offset = 0, cantidad = 50) {
    const r = await this.apiGet<CsjNotificacionesResponse>(
      `/Notificaciones/PorRecibir?offset=${offset}&cantidad=${cantidad}`
    );
    return r.resultado ?? [];
  }

  /** Notificaciones en un rango de fechas (ISO). */
  async getNotificacionesPorFecha(fechaInicio: string, fechaFin: string, offset = 0, cantidad = 50) {
    const r = await this.apiGet<CsjNotificacionesResponse>(
      `/Notificaciones/PorFecha?offset=${offset}&cantidad=${cantidad}&fechaInicio=${encodeURIComponent(
        fechaInicio
      )}&fechaFin=${encodeURIComponent(fechaFin)}`
    );
    return r.resultado ?? [];
  }

  /** Cantidad de notificaciones por recibir (para el badge del nav). */
  async getCantidadNotificacionesPorRecibir(): Promise<number> {
    const r = await this.apiGet<{ cantidad?: number } | number>(
      "/Notificaciones/CantidadNotificacionesPorRecibir"
    );
    return typeof r === "number" ? r : (r?.cantidad ?? 0);
  }

  // ── Documentos / PDF de una actuación ────────────────────────────────────
  // `cod` = codActuacionCaso. La URL usa la forma `{cod}:{instancia}`.
  async getDocumentosActuacion(
    casoId: number,
    instancia: string,
    cod: number
  ): Promise<CsjDocumento[]> {
    const r = await this.apiGet<CsjDocumentosResponse>(
      `/CasoJudicial/${casoId}/${instancia}/actuaciones/${cod}:${instancia}/documentos/`
    );
    return r.resultado ?? [];
  }

  /** Descarga el PDF binario de un documento de actuación. */
  async descargarDocumento(
    casoId: number,
    instancia: string,
    cod: number,
    idDocumento: number
  ): Promise<{ data: ArrayBuffer; contentType: string }> {
    await this.ensureAuth();
    const url = `${BASE}/api/gestion-partes/CasoJudicial/${casoId}/${instancia}/actuaciones/${cod}:${instancia}/documentos/${idDocumento}`;
    const hdr = () => ({ ...this.headers(), Accept: "*/*" });
    let res = await fetchTimeout(url, { headers: hdr() });
    if (res.status === 401 || res.status === 403) {
      await this.login();
      res = await fetchTimeout(url, { headers: hdr() });
    }
    if (!res.ok) {
      throw new CsjError(res.status, `Descarga del documento ${idDocumento} falló (${res.status})`);
    }
    return {
      data: await res.arrayBuffer(),
      contentType: res.headers.get("content-type") ?? "application/pdf",
    };
  }
}
