-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'CONTABLE', 'JURIDICO', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('CONTABLE', 'JURIDICO', 'AMBOS');

-- CreateEnum
CREATE TYPE "EstadoCliente" AS ENUM ('ACTIVO', 'INACTIVO', 'PROSPECTO');

-- CreateEnum
CREATE TYPE "EstadoFiscal" AS ENUM ('AL_DIA', 'ATRASADO', 'CCT', 'VECTOR_FISCAL');

-- CreateEnum
CREATE TYPE "TipoObligacion" AS ENUM ('IVA', 'IRE_SIMPLE', 'IRE_GENERAL', 'IRP', 'EEFF', 'AUDITORIA_EXTERNA', 'IDU', 'IUID', 'IPS', 'MITES', 'REG_MENSUAL_COMPROBANTES', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoObligacion" AS ENUM ('PENDIENTE', 'PRESENTADO', 'VENCIDO', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "TipoVencimiento" AS ENUM ('IVA', 'IRE_SIMPLE', 'IRE_GENERAL', 'IRP', 'EEFF', 'AUDITORIA_EXTERNA', 'IDU', 'IUID', 'IPS', 'MITES', 'REG_MENSUAL_COMPROBANTES', 'ASAMBLEA', 'RENOVACION_CONTRATO', 'PLAZO_PROCESAL', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoVencimiento" AS ENUM ('PENDIENTE', 'GESTIONADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('VENCIMIENTO_PROXIMO', 'TAREA_ASIGNADA', 'TAREA_VENCIDA', 'EXPEDIENTE_ACTUALIZADO', 'DECLARACION_FALTANTE', 'ARCHIVO_RECIBIDO');

-- CreateEnum
CREATE TYPE "EstadoLicencia" AS ENUM ('ACTIVA', 'SUSPENDIDA', 'POR_VENCER');

-- CreateEnum
CREATE TYPE "TipoExpediente" AS ENUM ('DEMANDA', 'CONTESTACION', 'APELACION', 'AUDIENCIA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoExpediente" AS ENUM ('NUEVO', 'EN_PROCESO', 'EN_REVISION', 'COMPLETADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "MetodoEnvioArchivo" AS ENUM ('ADJUNTO', 'LINK_FIRMADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licencia" (
    "id" TEXT NOT NULL,
    "estado" "EstadoLicencia" NOT NULL,
    "venceEl" TIMESTAMP(3) NOT NULL,
    "mensajeSuspension" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoLicencia" (
    "id" TEXT NOT NULL,
    "licenciaId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "nota" TEXT,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoLicencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "cedula" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "tipo" "TipoCliente" NOT NULL,
    "estado" "EstadoCliente" NOT NULL DEFAULT 'ACTIVO',
    "estadoFiscal" "EstadoFiscal" NOT NULL DEFAULT 'AL_DIA',
    "responsableId" TEXT NOT NULL,
    "accesos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteObligacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoObligacion" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClienteObligacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoMensual" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "obligacion" "TipoObligacion" NOT NULL,
    "estado" "EstadoObligacion" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPresentacion" TIMESTAMP(3),
    "responsableId" TEXT,
    "declaracionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoMensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Declaracion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoObligacion" NOT NULL,
    "periodo" TEXT NOT NULL,
    "fechaPresentacion" TIMESTAMP(3) NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "archivoPublicId" TEXT,
    "archivoNombreOriginal" TEXT,
    "tamanioBytes" INTEGER,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "cargadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Declaracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vencimiento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "expedienteId" TEXT,
    "tipo" "TipoVencimiento" NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoVencimiento" NOT NULL DEFAULT 'PENDIENTE',
    "responsableId" TEXT,
    "notificado7d" BOOLEAN NOT NULL DEFAULT false,
    "notificado3d" BOOLEAN NOT NULL DEFAULT false,
    "notificadoDia" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vencimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsambleaPrioridad" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "fechaEEFF" TIMESTAMP(3),
    "asambleaSolicitada" BOOLEAN NOT NULL DEFAULT false,
    "asambleaConfirmada" BOOLEAN NOT NULL DEFAULT false,
    "idu" BOOLEAN NOT NULL DEFAULT false,
    "mttes" BOOLEAN NOT NULL DEFAULT false,
    "regAdm" BOOLEAN NOT NULL DEFAULT false,
    "ips" BOOLEAN NOT NULL DEFAULT false,
    "libros" BOOLEAN NOT NULL DEFAULT false,
    "contAdm" BOOLEAN NOT NULL DEFAULT false,
    "auditoria" JSONB NOT NULL DEFAULT '{}',
    "ultimoEditorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsambleaPrioridad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "clienteId" TEXT,
    "expedienteId" TEXT,
    "responsableId" TEXT NOT NULL,
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
    "fechaLimite" TIMESTAMP(3),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "tareaId" TEXT,
    "expedienteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "entidadTipo" TEXT,
    "entidadId" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioArchivo" (
    "id" TEXT NOT NULL,
    "declaracionId" TEXT,
    "documentoId" TEXT,
    "remitenteId" TEXT NOT NULL,
    "destinatarioId" TEXT NOT NULL,
    "destinatarioEmail" TEXT NOT NULL,
    "mensaje" TEXT,
    "metodoEnvio" "MetodoEnvioArchivo" NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT true,
    "errorMensaje" TEXT,
    "resendMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvioArchivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expediente" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "TipoExpediente" NOT NULL,
    "estado" "EstadoExpediente" NOT NULL DEFAULT 'NUEVO',
    "responsableId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaLimite" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "subidoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialExpediente" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "estadoAnterior" "EstadoExpediente",
    "estadoNuevo" "EstadoExpediente" NOT NULL,
    "userId" TEXT NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialExpediente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_rol_idx" ON "User"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PagoLicencia_licenciaId_idx" ON "PagoLicencia"("licenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_ruc_key" ON "Cliente"("ruc");

-- CreateIndex
CREATE INDEX "Cliente_tipo_idx" ON "Cliente"("tipo");

-- CreateIndex
CREATE INDEX "Cliente_estado_idx" ON "Cliente"("estado");

-- CreateIndex
CREATE INDEX "Cliente_responsableId_idx" ON "Cliente"("responsableId");

-- CreateIndex
CREATE UNIQUE INDEX "ClienteObligacion_clienteId_tipo_key" ON "ClienteObligacion"("clienteId", "tipo");

-- CreateIndex
CREATE INDEX "EstadoMensual_mes_idx" ON "EstadoMensual"("mes");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoMensual_clienteId_mes_obligacion_key" ON "EstadoMensual"("clienteId", "mes", "obligacion");

-- CreateIndex
CREATE INDEX "Declaracion_clienteId_tipo_periodo_idx" ON "Declaracion"("clienteId", "tipo", "periodo");

-- CreateIndex
CREATE INDEX "Declaracion_archivado_idx" ON "Declaracion"("archivado");

-- CreateIndex
CREATE INDEX "Vencimiento_fechaVencimiento_estado_idx" ON "Vencimiento"("fechaVencimiento", "estado");

-- CreateIndex
CREATE INDEX "Vencimiento_clienteId_idx" ON "Vencimiento"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "AsambleaPrioridad_clienteId_periodo_key" ON "AsambleaPrioridad"("clienteId", "periodo");

-- CreateIndex
CREATE INDEX "Tarea_responsableId_estado_idx" ON "Tarea"("responsableId", "estado");

-- CreateIndex
CREATE INDEX "Tarea_clienteId_idx" ON "Tarea"("clienteId");

-- CreateIndex
CREATE INDEX "Tarea_expedienteId_idx" ON "Tarea"("expedienteId");

-- CreateIndex
CREATE INDEX "Nota_tareaId_idx" ON "Nota"("tareaId");

-- CreateIndex
CREATE INDEX "Nota_expedienteId_idx" ON "Nota"("expedienteId");

-- CreateIndex
CREATE INDEX "Notificacion_userId_leida_idx" ON "Notificacion"("userId", "leida");

-- CreateIndex
CREATE INDEX "Notificacion_createdAt_idx" ON "Notificacion"("createdAt");

-- CreateIndex
CREATE INDEX "EnvioArchivo_remitenteId_idx" ON "EnvioArchivo"("remitenteId");

-- CreateIndex
CREATE INDEX "EnvioArchivo_destinatarioId_idx" ON "EnvioArchivo"("destinatarioId");

-- CreateIndex
CREATE INDEX "EnvioArchivo_declaracionId_idx" ON "EnvioArchivo"("declaracionId");

-- CreateIndex
CREATE INDEX "Expediente_clienteId_idx" ON "Expediente"("clienteId");

-- CreateIndex
CREATE INDEX "Expediente_responsableId_idx" ON "Expediente"("responsableId");

-- CreateIndex
CREATE INDEX "Expediente_estado_idx" ON "Expediente"("estado");

-- CreateIndex
CREATE INDEX "Documento_expedienteId_idx" ON "Documento"("expedienteId");

-- CreateIndex
CREATE INDEX "HistorialExpediente_expedienteId_idx" ON "HistorialExpediente"("expedienteId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLicencia" ADD CONSTRAINT "PagoLicencia_licenciaId_fkey" FOREIGN KEY ("licenciaId") REFERENCES "Licencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoLicencia" ADD CONSTRAINT "PagoLicencia_registradoPor_fkey" FOREIGN KEY ("registradoPor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteObligacion" ADD CONSTRAINT "ClienteObligacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoMensual" ADD CONSTRAINT "EstadoMensual_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoMensual" ADD CONSTRAINT "EstadoMensual_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoMensual" ADD CONSTRAINT "EstadoMensual_declaracionId_fkey" FOREIGN KEY ("declaracionId") REFERENCES "Declaracion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declaracion" ADD CONSTRAINT "Declaracion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declaracion" ADD CONSTRAINT "Declaracion_cargadoPor_fkey" FOREIGN KEY ("cargadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vencimiento" ADD CONSTRAINT "Vencimiento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vencimiento" ADD CONSTRAINT "Vencimiento_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vencimiento" ADD CONSTRAINT "Vencimiento_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsambleaPrioridad" ADD CONSTRAINT "AsambleaPrioridad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsambleaPrioridad" ADD CONSTRAINT "AsambleaPrioridad_ultimoEditorId_fkey" FOREIGN KEY ("ultimoEditorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioArchivo" ADD CONSTRAINT "EnvioArchivo_declaracionId_fkey" FOREIGN KEY ("declaracionId") REFERENCES "Declaracion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioArchivo" ADD CONSTRAINT "EnvioArchivo_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioArchivo" ADD CONSTRAINT "EnvioArchivo_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioArchivo" ADD CONSTRAINT "EnvioArchivo_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_subidoPor_fkey" FOREIGN KEY ("subidoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialExpediente" ADD CONSTRAINT "HistorialExpediente_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "Expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialExpediente" ADD CONSTRAINT "HistorialExpediente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
