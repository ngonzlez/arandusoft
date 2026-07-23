-- AlterEnum
ALTER TYPE "public"."TipoVencimiento" ADD VALUE 'AUDIENCIA';

-- AlterTable
ALTER TABLE "public"."Expediente" ADD COLUMN     "actuacionesRevisadasAt" TIMESTAMP(3),
ADD COLUMN     "caratula" TEXT,
ADD COLUMN     "circunscripcionId" TEXT,
ADD COLUMN     "csjCasoId" TEXT,
ADD COLUMN     "csjInstancia" TEXT,
ADD COLUMN     "csjSyncAt" TIMESTAMP(3),
ADD COLUMN     "despachoCsj" TEXT,
ADD COLUMN     "expedientePadreId" TEXT,
ADD COLUMN     "fase" TEXT,
ADD COLUMN     "materiaId" TEXT,
ADD COLUMN     "monto" TEXT,
ADD COLUMN     "origenCsj" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proceso" TEXT;

-- AlterTable
ALTER TABLE "public"."Vencimiento" ADD COLUMN     "diasHabiles" INTEGER,
ADD COLUMN     "fechaBase" TIMESTAMP(3),
ADD COLUMN     "subtipoPlazo" TEXT;

-- CreateTable
CREATE TABLE "public"."Actuacion" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "csjId" TEXT,
    "grupoProceso" TEXT,
    "procesoJudicial" TEXT,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT,
    "estado" TEXT,
    "despacho" TEXT,
    "fecha" TIMESTAMP(3),
    "tieneNotificacion" BOOLEAN NOT NULL DEFAULT false,
    "pdfDisponible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentos" JSONB,

    CONSTRAINT "Actuacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Circunscripcion" (
    "id" TEXT NOT NULL,
    "csjId" TEXT,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Circunscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CredencialCsj" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usuarioEnc" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "matricula" TEXT,
    "ultimoSync" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredencialCsj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Feriado" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "movil" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Feriado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Interviniente" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "instancia" TEXT,
    "tipoParte" TEXT,
    "nombre" TEXT NOT NULL,
    "tipoDocumento" TEXT,
    "nroDocumento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interviniente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Materia" (
    "id" TEXT NOT NULL,
    "csjId" TEXT,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Materia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MovimientoCaso" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "despacho" TEXT NOT NULL,
    "estado" TEXT,
    "instancia" TEXT,
    "fechaIngreso" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCaso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificacionCsj" (
    "id" TEXT NOT NULL,
    "codNotificacionOrigen" TEXT NOT NULL,
    "expedienteId" TEXT,
    "csjCasoId" TEXT,
    "csjInstancia" TEXT,
    "caratula" TEXT,
    "despacho" TEXT,
    "proceso" TEXT,
    "descripcion" TEXT,
    "fechaNotificacion" TIMESTAMP(3),
    "revisadoEnCsj" BOOLEAN NOT NULL DEFAULT false,
    "alertadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacionCsj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReporteExpediente" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "creadoPor" TEXT NOT NULL,
    "incluyeActuaciones" BOOLEAN NOT NULL DEFAULT true,
    "expiraEl" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReporteExpediente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Actuacion_expedienteId_csjId_key" ON "public"."Actuacion"("expedienteId" ASC, "csjId" ASC);

-- CreateIndex
CREATE INDEX "Actuacion_expedienteId_idx" ON "public"."Actuacion"("expedienteId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Circunscripcion_csjId_key" ON "public"."Circunscripcion"("csjId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Circunscripcion_nombre_key" ON "public"."Circunscripcion"("nombre" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CredencialCsj_userId_key" ON "public"."CredencialCsj"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Feriado_fecha_key" ON "public"."Feriado"("fecha" ASC);

-- CreateIndex
CREATE INDEX "Interviniente_expedienteId_idx" ON "public"."Interviniente"("expedienteId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Materia_csjId_key" ON "public"."Materia"("csjId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Materia_nombre_key" ON "public"."Materia"("nombre" ASC);

-- CreateIndex
CREATE INDEX "MovimientoCaso_expedienteId_idx" ON "public"."MovimientoCaso"("expedienteId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "NotificacionCsj_codNotificacionOrigen_key" ON "public"."NotificacionCsj"("codNotificacionOrigen" ASC);

-- CreateIndex
CREATE INDEX "NotificacionCsj_expedienteId_idx" ON "public"."NotificacionCsj"("expedienteId" ASC);

-- CreateIndex
CREATE INDEX "NotificacionCsj_fechaNotificacion_idx" ON "public"."NotificacionCsj"("fechaNotificacion" ASC);

-- CreateIndex
CREATE INDEX "ReporteExpediente_expedienteId_idx" ON "public"."ReporteExpediente"("expedienteId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReporteExpediente_token_key" ON "public"."ReporteExpediente"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Expediente_csjCasoId_csjInstancia_key" ON "public"."Expediente"("csjCasoId" ASC, "csjInstancia" ASC);

-- AddForeignKey
ALTER TABLE "public"."Actuacion" ADD CONSTRAINT "Actuacion_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "public"."Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CredencialCsj" ADD CONSTRAINT "CredencialCsj_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expediente" ADD CONSTRAINT "Expediente_circunscripcionId_fkey" FOREIGN KEY ("circunscripcionId") REFERENCES "public"."Circunscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expediente" ADD CONSTRAINT "Expediente_expedientePadreId_fkey" FOREIGN KEY ("expedientePadreId") REFERENCES "public"."Expediente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expediente" ADD CONSTRAINT "Expediente_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "public"."Materia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interviniente" ADD CONSTRAINT "Interviniente_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "public"."Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MovimientoCaso" ADD CONSTRAINT "MovimientoCaso_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "public"."Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificacionCsj" ADD CONSTRAINT "NotificacionCsj_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "public"."Expediente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReporteExpediente" ADD CONSTRAINT "ReporteExpediente_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "public"."Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

