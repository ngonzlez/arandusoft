import "server-only";
import { prisma } from "@/lib/prisma";
import type { CsjClient } from "./client";
import { mapActuacion, mapCaso, mapMovimiento, mapParte } from "./mappers";
import type { CsjCasoListado, CsjDocumento } from "./types";

export interface ImportarCasoParams {
  casoId: number;
  instancia: string; // "origen:esCorte", ej "2:0"
  responsableId: string; // usuario del sistema dueño del expediente
  clienteId?: string | null;
  // Opcional: datos del listado (carátula/despacho) si ya los tenemos, para
  // no depender solo del detalle.
  listado?: CsjCasoListado;
  // false en el cron/sync: salta el burst de 50 llamadas de PDF (más rápido y
  // sin rate-limit). Los PDF se traen en el import manual o on-demand.
  traerDocumentos?: boolean;
}

export interface ImportarCasoResultado {
  expedienteId: string;
  creado: boolean;
  actuaciones: number;
  intervinientes: number;
  movimientos: number;
  actuacionesNuevas: { descripcion: string; fecha: Date | null }[];
}

// Importa (o re-sincroniza) un caso CSJ completo al sistema. Idempotente por
// el unique (csjCasoId, csjInstancia): re-importar no duplica.
export async function importarCaso(
  csj: CsjClient,
  { casoId, instancia, responsableId, clienteId, listado, traerDocumentos = true }: ImportarCasoParams
): Promise<ImportarCasoResultado> {
  const detalle = await csj.getCasoDetalle(casoId, instancia).catch(() => undefined);
  // Traemos las actuaciones temprano: el detalle no incluye el despacho/juzgado,
  // así que lo tomamos de la lista (si vino) o de la actuación más reciente.
  const actuaciones = await csj.getActuaciones(casoId, instancia).catch(() => []);
  const base =
    listado ??
    ({
      codCasoJudicial: casoId,
      origen: Number(instancia.split(":")[0]),
      esCorte: Number(instancia.split(":")[1] ?? 0),
      caratula: detalle?.caratula ?? "",
      nroExpedienteNumero: detalle?.nroExpedienteNumero ?? 0,
      nroExpedienteAnio: detalle?.nroExpedienteAnio ?? 0,
    } as CsjCasoListado);

  const datos = mapCaso(base, detalle);
  const despacho = datos.despacho ?? actuaciones[0]?.descripcionDespacho ?? null;
  const otros = (await csj.getOtrosDatos(casoId, instancia).catch(() => null))?.primeraInstancia ?? null;
  // Partes y movimientos ANTES del burst de documentos (evita rate-limit transitorio).
  const partesData = await csj.getPartes(casoId, instancia).catch(() => []);
  const movsData = await csj.getMovimientos(casoId, instancia).catch(() => []);

  // Resolver catálogos (upsert por nombre).
  const materiaId = datos.materiaNombre
    ? (
        await prisma.materia.upsert({
          where: { nombre: datos.materiaNombre },
          create: { nombre: datos.materiaNombre },
          update: {},
        })
      ).id
    : null;
  const circunscripcionId = datos.circunscripcionNombre
    ? (
        await prisma.circunscripcion.upsert({
          where: { nombre: datos.circunscripcionNombre },
          create: { nombre: datos.circunscripcionNombre },
          update: {},
        })
      ).id
    : null;

  const caratula = datos.caratula || `Caso CSJ ${datos.csjCasoId}`;

  // ¿existe ya? (para el flag `creado` y para no pisar campos del usuario)
  const existente = await prisma.expediente.findUnique({
    where: { csjCasoId_csjInstancia: { csjCasoId: datos.csjCasoId, csjInstancia: datos.csjInstancia } },
    select: { id: true },
  });

  const expediente = await prisma.expediente.upsert({
    where: { csjCasoId_csjInstancia: { csjCasoId: datos.csjCasoId, csjInstancia: datos.csjInstancia } },
    create: {
      titulo: caratula,
      caratula,
      tipo: "OTRO",
      responsableId,
      clienteId: clienteId || null,
      fechaInicio: new Date(),
      numero: datos.numero != null ? String(datos.numero) : null,
      anio: datos.anio,
      csjCasoId: datos.csjCasoId,
      csjInstancia: datos.csjInstancia,
      despachoCsj: despacho,
      proceso: otros?.proceso ?? null,
      fase: otros?.fase ?? null,
      monto: otros?.monto ?? null,
      origenCsj: true,
      csjSyncAt: new Date(),
      materiaId,
      circunscripcionId,
    },
    // En re-sync no pisamos titulo/estado/responsable/cliente (los maneja el
    // usuario); refrescamos solo lo que viene de CSJ.
    update: {
      caratula,
      numero: datos.numero != null ? String(datos.numero) : null,
      anio: datos.anio,
      despachoCsj: despacho,
      proceso: otros?.proceso ?? null,
      fase: otros?.fase ?? null,
      monto: otros?.monto ?? null,
      materiaId,
      circunscripcionId,
      origenCsj: true,
      csjSyncAt: new Date(),
    },
  });

  // csjId de las actuaciones que YA existían → para detectar las nuevas (Radar).
  const existentesActs = new Set(
    (
      await prisma.actuacion.findMany({
        where: { expedienteId: expediente.id },
        select: { csjId: true },
      })
    )
      .map((a) => a.csjId)
      .filter((x): x is string => !!x)
  );

  // Documentos (PDF) por actuación — en lotes de 8 para no gatillar rate-limit.
  // En el sync (traerDocumentos:false) se saltea y no se pisan los docs existentes.
  const docsMap = new Map<number, CsjDocumento[]>();
  if (traerDocumentos) {
    const LOTE = 8;
    for (let i = 0; i < actuaciones.length; i += LOTE) {
      const lote = actuaciones.slice(i, i + LOTE);
      const res = await Promise.all(
        lote.map((a) =>
          csj
            .getDocumentosActuacion(casoId, instancia, a.codActuacionCaso)
            .then((docs) => [a.codActuacionCaso, docs] as const)
            .catch(() => [a.codActuacionCaso, [] as CsjDocumento[]] as const)
        )
      );
      res.forEach(([cod, docs]) => docsMap.set(cod, docs));
    }
  }

  // Actuaciones — upsert batched por (expedienteId, csjId).
  await Promise.all(
    actuaciones.map((a) => {
      const m = mapActuacion(a);
      const extra = traerDocumentos
        ? {
            pdfDisponible: (docsMap.get(a.codActuacionCaso) ?? []).length > 0,
            documentos: (docsMap.get(a.codActuacionCaso) ?? []).map((d) => ({
              idDocumento: d.idDocumento,
              descripcion: d.descripcion,
            })),
          }
        : {};
      return prisma.actuacion.upsert({
        where: { expedienteId_csjId: { expedienteId: expediente.id, csjId: m.csjId } },
        create: { expedienteId: expediente.id, ...m, ...extra },
        update: { ...m, ...extra },
      });
    })
  );

  // Actuaciones nuevas (no estaban antes) — señal para el Radar.
  const actuacionesNuevas = actuaciones
    .filter((a) => !existentesActs.has(String(a.codActuacionCaso)))
    .map((a) => ({
      descripcion: a.descripcionActuacion,
      fecha: a.fechaActuacion ? new Date(a.fechaActuacion) : null,
    }));

  // Partes del caso (Demandante/Demandado) — endpoint /partes/. Reemplazo
  // completo solo si CSJ devolvió alguna (evita borrar si viene vacío).
  let intervinientes = 0;
  if (partesData.length > 0) {
    await prisma.$transaction([
      prisma.interviniente.deleteMany({ where: { expedienteId: expediente.id } }),
      prisma.interviniente.createMany({
        data: partesData.map((p) => ({ expedienteId: expediente.id, ...mapParte(p) })),
      }),
    ]);
    intervinientes = partesData.length;
  }

  // Movimientos del caso (pases entre despachos).
  let movimientos = 0;
  if (movsData.length > 0) {
    await prisma.$transaction([
      prisma.movimientoCaso.deleteMany({ where: { expedienteId: expediente.id } }),
      prisma.movimientoCaso.createMany({
        data: movsData.map((m) => ({ expedienteId: expediente.id, ...mapMovimiento(m) })),
      }),
    ]);
    movimientos = movsData.length;
  }

  await prisma.historialExpediente.create({
    data: {
      expedienteId: expediente.id,
      estadoNuevo: expediente.estado,
      userId: responsableId,
      comentario: existente ? "Re-sincronizado desde CSJ" : "Importado desde CSJ",
    },
  });

  return {
    expedienteId: expediente.id,
    creado: !existente,
    actuaciones: actuaciones.length,
    intervinientes,
    movimientos,
    actuacionesNuevas,
  };
}
