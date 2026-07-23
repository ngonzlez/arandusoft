// Motor de plazos procesales: cuenta días hábiles excluyendo fines de semana,
// feriados de Paraguay y (opcional) la feria judicial de enero.
// Puro y sin dependencias → usable en el servidor (cálculo autoritativo) y en
// el cliente (preview en vivo de la calculadora).

// Domingo de Pascua (algoritmo de Meeus/Butcher) → base de Semana Santa.
function domingoPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

// Feriados nacionales de Paraguay para un año (fijos + Semana Santa).
export function feriadosPy(anio: number): Set<string> {
  const fijos = [
    [1, 1], // Año Nuevo
    [3, 1], // Día de los Héroes
    [5, 1], // Día del Trabajador
    [5, 14], // Independencia
    [5, 15], // Independencia
    [6, 12], // Paz del Chaco
    [8, 15], // Fundación de Asunción
    [9, 29], // Batalla de Boquerón
    [12, 8], // Virgen de Caacupé
    [12, 25], // Navidad
  ];
  const set = new Set<string>(fijos.map(([m, d]) => iso(new Date(anio, m - 1, d))));
  const pascua = domingoPascua(anio);
  const jueves = new Date(pascua);
  jueves.setDate(pascua.getDate() - 3); // Jueves Santo
  const viernes = new Date(pascua);
  viernes.setDate(pascua.getDate() - 2); // Viernes Santo
  set.add(iso(jueves));
  set.add(iso(viernes));
  return set;
}

export interface OpcionesPlazo {
  excluirEnero?: boolean; // feria judicial: enero NO cuenta (default true)
  feriadosExcluidos?: string[]; // yyyy-mm-dd que el usuario desmarcó (SÍ cuentan)
}

function esHabil(d: Date, opts: OpcionesPlazo): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false; // dom / sáb
  if ((opts.excluirEnero ?? true) && d.getMonth() === 0) return false; // enero = feria
  const key = iso(d);
  if (opts.feriadosExcluidos?.includes(key)) return true; // usuario lo cuenta igual
  return !feriadosPy(d.getFullYear()).has(key);
}

// Cuenta `dias` días hábiles a partir del día SIGUIENTE a `fechaBase`.
export function contarDiasHabiles(fechaBase: Date, dias: number, opts: OpcionesPlazo = {}): Date {
  const d = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());
  let contados = 0;
  // Guardarraíl: máx ~2 años de iteración.
  for (let i = 0; i < 1000 && contados < dias; i++) {
    d.setDate(d.getDate() + 1);
    if (esHabil(d, opts)) contados++;
  }
  return d;
}

// Lista los feriados PY que caen dentro de [fechaBase, hasta] — para los toggles
// de la UI ("desmarcar para excluir de este plazo").
export function feriadosEnRango(desde: Date, hasta: Date): { fecha: string; nombre: string }[] {
  const NOMBRES: Record<string, string> = {
    "01-01": "Año Nuevo",
    "03-01": "Día de los Héroes",
    "05-01": "Día del Trabajador",
    "05-14": "Independencia",
    "05-15": "Independencia",
    "06-12": "Paz del Chaco",
    "08-15": "Fundación de Asunción",
    "09-29": "Batalla de Boquerón",
    "12-08": "Virgen de Caacupé",
    "12-25": "Navidad",
  };
  const res: { fecha: string; nombre: string }[] = [];
  for (let a = desde.getFullYear(); a <= hasta.getFullYear(); a++) {
    for (const f of feriadosPy(a)) {
      const dt = new Date(`${f}T00:00:00`);
      if (dt >= desde && dt <= hasta) {
        res.push({ fecha: f, nombre: NOMBRES[f.slice(5)] ?? "Feriado (Semana Santa)" });
      }
    }
  }
  return res.sort((x, y) => x.fecha.localeCompare(y.fecha));
}
