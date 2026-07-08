// Workaround de un bug de npm 11.x: al regenerar package-lock.json escribe la
// dependencia opcional de sharp para Windows como una entrada anidada vacía
// ({"optional":true} sin version), lo que rompe `npm ci` en Linux/Docker con
// "npm error Invalid Version:".
//
// Este script la reemplaza por la entrada top-level correcta (datos reales del
// registro de npm). Correr después de cualquier `npm install` que toque el
// lockfile: `node scripts/fix-lockfile.js`

const fs = require("fs");
const path = require("path");

const LOCKFILE = path.join(__dirname, "..", "package-lock.json");
const CORRUPTA = "node_modules/sharp/node_modules/@img/sharp-win32-x64";
const TOP_LEVEL = "node_modules/@img/sharp-win32-x64";

async function main() {
  const lock = JSON.parse(fs.readFileSync(LOCKFILE, "utf8"));
  const entrada = lock.packages[CORRUPTA];

  if (!entrada || entrada.version) {
    console.log("[fix-lockfile] Nada que corregir.");
    return;
  }

  // Versión de sharp que fija el lockfile — el binario win32 usa la misma
  const sharpVersion = lock.packages["node_modules/sharp"]?.version;
  if (!sharpVersion) throw new Error("No se encontró sharp en el lockfile");

  const res = await fetch(`https://registry.npmjs.org/@img%2fsharp-win32-x64/${sharpVersion}`);
  if (!res.ok) throw new Error(`Registro respondió ${res.status}`);
  const meta = await res.json();

  delete lock.packages[CORRUPTA];
  lock.packages[TOP_LEVEL] = {
    version: meta.version,
    resolved: meta.dist.tarball,
    integrity: meta.dist.integrity,
    cpu: ["x64"],
    license: meta.license,
    optional: true,
    os: ["win32"],
    engines: meta.engines,
  };

  fs.writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2) + "\n");
  console.log(`[fix-lockfile] Corregido: ${TOP_LEVEL}@${meta.version}`);
}

main().catch((e) => {
  console.error("[fix-lockfile] Error:", e.message);
  process.exit(1);
});
