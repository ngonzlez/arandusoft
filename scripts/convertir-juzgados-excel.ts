// Conversión de una sola vez: docs/Juzgados_y_Secretarias.xlsx → prisma/data/juzgados-referencia.json
// Corre a mano (no en build ni en el seed en cada corrida). El JSON resultante
// se revisa a ojo y se commitea; el seed lo importa desde ahí, no desde el xlsx
// (así el contenedor de producción no depende de docs/, que no se copia a la imagen).
//
// Parseo estructural best-effort: separa "Juzgado X. Secretaría N" en
// Juzgado+Secretaría cuando el patrón aparece; si no, la fila entera es un
// Juzgado standalone sin secretaría. Esto es un parseo mecánico de la fuente
// que el estudio proveyó — no una verificación del dato judicial. Revisar
// después vía el CRUD de Configuración.

import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

interface JuzgadoRef {
  nombre: string;
  circunscripcion: string | null;
  fuero: string | null;
  juezActual: string | null;
  ubicacion: string | null;
  telefono: string | null;
  secretarias: { nombre: string; actuario: string | null; telefono: string | null }[];
}

const RE_SECRETARIA = /^(.+?)\.?\s*[-—]?\s*Secretar[ií]a\.?\s*[Nn]?[º°o]?\.?\s*(\d+)\s*$/i;
const RE_SEC_ABREV = /^(.+?)\s+SEC\.?\s*(\d+)\s*$/i;

function limpio(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

// Mapa nombre-base-normalizado → JuzgadoRef, para agrupar filas de la misma
// hoja que comparten juzgado pero difieren en secretaría.
function nuevoAcumulador() {
  const porClave = new Map<string, JuzgadoRef>();
  function obtener(nombre: string, circunscripcion: string | null): JuzgadoRef {
    const clave = `${nombre}::${circunscripcion ?? ""}`;
    let j = porClave.get(clave);
    if (!j) {
      j = { nombre, circunscripcion, fuero: null, juezActual: null, ubicacion: null, telefono: null, secretarias: [] };
      porClave.set(clave, j);
    }
    return j;
  }
  return { obtener, todos: () => [...porClave.values()] };
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(__dirname, "../docs/Juzgados_y_Secretarias.xlsx"));

  const acc = nuevoAcumulador();

  // ── Hoja 1: Capital - Juzgados ──
  // Cols: 1=Juzgado/Secretaría, 2=Ubicación, 3=Juez/a, 4=Actuario/Secretario, 5=Teléfono
  const s1 = wb.getWorksheet("Capital - Juzgados")!;
  s1.eachRow((row, n) => {
    if (n === 1) return; // header
    const nombreCompleto = limpio(row.getCell(1).value);
    if (!nombreCompleto) return;
    const ubicacion = limpio(row.getCell(2).value);
    const juez = limpio(row.getCell(3).value);
    const actuario = limpio(row.getCell(4).value);
    const telefono = limpio(row.getCell(5).value);

    const m = nombreCompleto.match(RE_SECRETARIA);
    if (m) {
      const base = m[1].trim().replace(/\.$/, "").trim();
      const j = acc.obtener(base, "Capital");
      j.juezActual ??= juez;
      j.ubicacion ??= ubicacion;
      j.secretarias.push({ nombre: `Secretaría ${m[2]}`, actuario, telefono });
    } else {
      const j = acc.obtener(nombreCompleto, "Capital");
      j.juezActual ??= juez;
      j.ubicacion ??= ubicacion;
      j.telefono ??= telefono;
    }
  });

  // ── Hoja 2: Juzgados de Paz ──
  // Cols: 1=Circunscripción (Capital/Dpto. Central), 2=Localidad/Juzgado de Paz, 3=Juez/a, 4=Dirección, 5=Teléfono
  const s2 = wb.getWorksheet("Juzgados de Paz")!;
  s2.eachRow((row, n) => {
    if (n === 1) return;
    const localidad = limpio(row.getCell(2).value);
    if (!localidad) return;
    const circAmplia = limpio(row.getCell(1).value) ?? "";
    const juez = limpio(row.getCell(3).value);
    const direccion = limpio(row.getCell(4).value);
    const telefono = limpio(row.getCell(5).value);

    const j = acc.obtener(`Juzgado de Paz — ${localidad}`, circAmplia);
    j.fuero ??= "Paz";
    j.juezActual ??= juez;
    j.ubicacion ??= direccion;
    j.telefono ??= telefono;
  });

  // ── Hoja 3: Dpto. Central - Contactos ──
  // Cols: 1=Dependencia, 2=Sede (ciudad), 3=Funcionario, 4=Cargo, 5=Contacto
  // Funcionario acá es el actuario/secretario (Cargo = "ACTUARIO JUDICIAL" en
  // todas las filas de muestra), no el juez — esta hoja no trae juez.
  const s3 = wb.getWorksheet("Dpto. Central - Contactos")!;
  s3.eachRow((row, n) => {
    if (n === 1) return;
    const dependencia = limpio(row.getCell(1).value);
    if (!dependencia) return;
    const sede = limpio(row.getCell(2).value);
    const funcionario = limpio(row.getCell(3).value);
    const telefono = limpio(row.getCell(5).value);

    const m = dependencia.match(RE_SEC_ABREV);
    if (m) {
      const base = m[1].trim().replace(/\.$/, "").trim();
      const j = acc.obtener(base, sede);
      j.secretarias.push({ nombre: `Secretaría ${m[2]}`, actuario: funcionario, telefono });
    } else {
      const j = acc.obtener(dependencia, sede);
      j.telefono ??= telefono;
    }
  });

  const juzgados = acc.todos();
  const totalSecretarias = juzgados.reduce((n, j) => n + j.secretarias.length, 0);
  const standalone = juzgados.filter((j) => j.secretarias.length === 0).length;

  const outPath = join(__dirname, "../prisma/data/juzgados-referencia.json");
  writeFileSync(outPath, JSON.stringify(juzgados, null, 2), "utf-8");

  console.log(`Juzgados únicos: ${juzgados.length}`);
  console.log(`  con secretaría(s): ${juzgados.length - standalone}`);
  console.log(`  standalone (sin secretaría separable): ${standalone}`);
  console.log(`Secretarías totales: ${totalSecretarias}`);
  console.log(`Escrito: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
