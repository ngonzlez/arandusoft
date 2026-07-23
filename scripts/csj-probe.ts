/**
 * Spike de validación CSJ — Paso 1 del plan de integración.
 *
 * Objetivo: comprobar, antes de construir el conector encima de la API no
 * oficial de CSJ:
 *   1. ¿El servidor ALCANZA apps.csj.gov.py? (IP / red)
 *   2. ¿Se puede EXTRAER datos con un Bearer token válido? (modo CSJ_TOKEN)
 *   3. ¿Se puede LOGUEAR programáticamente para obtener ese token? (login)
 *
 * La API devuelve 403 a requests "no-navegador" (le falta Origin/Referer/
 * cookies). Este probe manda headers de navegador completos + cookies para
 * pasar ese gate.
 *
 * NO commitea nada, NO toca la base de datos. Solo lee env e imprime.
 *
 * ─────────────────────────── USO ───────────────────────────
 * MODO A — probar EXTRACCIÓN con token del navegador (lo más confiable):
 *   1. En el navegador, logueado en apps.csj.gov.py/gestion-partes, abrir
 *      DevTools → Network → clickear cualquier request a /api/gestion-partes/*
 *      → pestaña Headers → copiar el valor de "authorization" DESPUÉS de "Bearer ".
 *   2. .env.local:
 *        CSJ_TOKEN="eyJ...."   (el token largo)
 *        CSJ_CASO_ID="2983833"
 *        CSJ_INSTANCIA="2:0"
 *   3. npx tsx --env-file=.env.local scripts/csj-probe.ts
 *
 * MODO B — probar LOGIN programático:
 *   .env.local:
 *        CSJ_USUARIO="1435263"
 *        CSJ_PASSWORD="..."
 *   npx tsx --env-file=.env.local scripts/csj-probe.ts
 *
 * Correrlo también DESDE EL HOSTING para confirmar la IP de producción.
 */

const BASE = (process.env.CSJ_BASE_URL ?? "https://apps.csj.gov.py").replace(/\/$/, "");
const USUARIO = process.env.CSJ_USUARIO ?? "";
const PASSWORD = process.env.CSJ_PASSWORD ?? "";
const TOKEN_MANUAL = process.env.CSJ_TOKEN ?? "";
const CASO_ID = process.env.CSJ_CASO_ID ?? "";
const INSTANCIA = process.env.CSJ_INSTANCIA ?? "2:0";

const TIMEOUT_MS = 20_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Cookies acumuladas entre requests (jar mínimo).
let COOKIES = "";

function log(...args: unknown[]) {
  console.log(...args);
}
function seccion(titulo: string) {
  log("\n" + "=".repeat(70) + "\n" + titulo + "\n" + "=".repeat(70));
}

// Headers de navegador — clave para pasar el gate 403. Origin/Referer/Sec-Fetch
// hacen que el request parezca venir del propio SPA de CSJ.
function browserHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    Origin: BASE,
    Referer: `${BASE}/gestion-partes`,
    "User-Agent": UA,
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    ...extra,
  };
  if (COOKIES) h.Cookie = COOKIES;
  return h;
}

function guardarCookies(res: Response) {
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) {
    const nuevas = set.map((c) => c.split(";")[0]).join("; ");
    COOKIES = COOKIES ? `${COOKIES}; ${nuevas}` : nuevas;
  }
}

async function fetchConTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "manual" });
  } finally {
    clearTimeout(t);
  }
}

// GET inicial al SPA para recolectar cookies de sesión/antiforgery.
async function bootstrapCookies() {
  seccion("BOOTSTRAP — GET /gestion-partes (recolectar cookies)");
  try {
    const res = await fetchConTimeout(`${BASE}/gestion-partes`, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es-ES,es;q=0.9",
        "User-Agent": UA,
      },
    });
    guardarCookies(res);
    log(`  → ${res.status} ${res.statusText}`);
    log(`  cookies: ${COOKIES || "(ninguna)"}`);
  } catch (e) {
    log(`  → ERROR DE RED: ${(e as Error).message}`);
  }
}

async function login(): Promise<string | null> {
  const url = `${BASE}/autenticador/validar_login`;
  seccion(`LOGIN → POST ${url}`);

  const jsonCandidatos: Record<string, string>[] = [
    { usuario: USUARIO, clave: PASSWORD },
    { usuario: USUARIO, password: PASSWORD },
    { usuario: USUARIO, contrasena: PASSWORD },
    { user: USUARIO, password: PASSWORD },
    { username: USUARIO, password: PASSWORD },
  ];

  for (const body of jsonCandidatos) {
    const campos = Object.keys(body).join(",");
    try {
      const res = await fetchConTimeout(url, {
        method: "POST",
        headers: browserHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      guardarCookies(res);
      const texto = await res.text();
      log(`  [JSON ${campos}] → ${res.status} ${res.statusText}`);
      if (res.ok) {
        log("  RESPUESTA COMPLETA (para ver dónde viene el token):");
        log(texto.slice(0, 2000));
        const token = extraerToken(res, texto);
        if (token) return token;
        log("  ⚠️  2xx pero no encontré token — revisar respuesta de arriba.");
      } else {
        log(`  ${texto.slice(0, 300)}`);
      }
    } catch (e) {
      log(`  [JSON ${campos}] → ERROR DE RED: ${(e as Error).message}`);
      return null;
    }
  }
  return null;
}

function extraerToken(res: Response, texto: string): string | null {
  const authHeader = res.headers.get("authorization");
  if (authHeader) return authHeader.replace(/^Bearer\s+/i, "");
  try {
    const json = JSON.parse(texto) as Record<string, unknown>;
    for (const k of ["token", "access_token", "accessToken", "bearer", "jwt", "id_token"]) {
      const v = json[k];
      if (typeof v === "string" && v.length > 20) return v;
    }
    const data = json.data as Record<string, unknown> | undefined;
    if (data) {
      for (const k of ["token", "access_token", "accessToken"]) {
        const v = data[k];
        if (typeof v === "string" && v.length > 20) return v;
      }
    }
  } catch {
    /* no era JSON */
  }
  return null;
}

async function getAutenticado(path: string, token: string) {
  const url = `${BASE}${path}`;
  seccion(`GET ${url}`);
  try {
    const res = await fetchConTimeout(url, {
      headers: browserHeaders({ Authorization: `Bearer ${token}` }),
    });
    const texto = await res.text();
    log(`  → ${res.status} ${res.statusText}  (${texto.length} bytes)`);
    try {
      log(JSON.stringify(JSON.parse(texto), null, 2).slice(0, 6000));
    } catch {
      log(texto.slice(0, 2000));
    }
  } catch (e) {
    log(`  → ERROR DE RED: ${(e as Error).message}`);
  }
}

async function probarEndpoints(token: string) {
  seccion("✅ TOKEN EN USO");
  log(`  ${token.slice(0, 40)}... (${token.length} chars)`);

  await getAutenticado(
    "/api/gestion-partes/CasoJudicial/UltimosDiezDias?offset=0&cantidad=10",
    token
  );
  await getAutenticado("/api/gestion-partes/Materias?", token);
  await getAutenticado("/api/gestion-partes/Circunscripciones?", token);
  await getAutenticado("/api/gestion-partes/TiposGrupoProceso?", token);

  if (CASO_ID) {
    await getAutenticado(`/api/gestion-partes/CasoJudicial/${CASO_ID}/${INSTANCIA}/`, token);
    await getAutenticado(
      `/api/gestion-partes/CasoJudicial/${CASO_ID}/${INSTANCIA}/actuaciones/?&offset=0&cantidad=10&incluirNotificaciones=true`,
      token
    );
  }
}

async function main() {
  seccion("CSJ PROBE — configuración");
  log(`  BASE       = ${BASE}`);
  log(`  MODO       = ${TOKEN_MANUAL ? "A (token del navegador)" : "B (login programático)"}`);
  log(`  USUARIO    = ${USUARIO || "(vacío)"}`);
  log(`  CASO_ID    = ${CASO_ID || "(no seteado)"}`);
  log(`  INSTANCIA  = ${INSTANCIA}`);

  await bootstrapCookies();

  // MODO A: token pegado del navegador → probar extracción directo.
  if (TOKEN_MANUAL) {
    await probarEndpoints(TOKEN_MANUAL);
    seccion("RESULTADO");
    log("✅ Si los GET dieron 200 con JSON → la EXTRACCIÓN funciona desde este server.");
    log("   Copiame todo el output para escribir types/modelos según el shape real.");
    log("   (El login programático se resuelve aparte — ver MODO B.)");
    return;
  }

  // MODO B: login programático.
  if (!USUARIO || !PASSWORD) {
    log("\n❌ Sin CSJ_TOKEN ni CSJ_USUARIO/CSJ_PASSWORD. Ver USO arriba.");
    process.exit(1);
  }

  const token = await login();
  if (!token) {
    seccion("RESULTADO");
    log("❌ Login falló. Diagnóstico:");
    log("   - 403 en todos → gate anti-bot: falta un header/cookie que sí manda el");
    log("     navegador. SOLUCIÓN: en DevTools → Network → request validar_login →");
    log("     click derecho → 'Copy as cURL' y pasámelo: ahí veo headers/cookies/body exactos.");
    log("   - ERROR DE RED → problema de IP/red (proxy Paraguay).");
    log("   - 401 → usuario/contraseña incorrectos.");
    log("   Mientras tanto, usá MODO A (CSJ_TOKEN) para validar la extracción.");
    process.exit(1);
  }

  await probarEndpoints(token);
  seccion("RESULTADO");
  log("✅ Probe terminado. Copiame TODO el output.");
}

main().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});
