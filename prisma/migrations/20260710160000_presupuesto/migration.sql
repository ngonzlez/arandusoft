-- CreateEnum
CREATE TYPE "EstadoPresupuesto" AS ENUM ('BORRADOR', 'EMITIDO', 'ANULADO');

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'BORRADOR',
    "numero" INTEGER,
    "anio" INTEGER,
    "clienteId" TEXT,
    "destNombre" TEXT NOT NULL,
    "destRuc" TEXT,
    "destDireccion" TEXT,
    "destTelefono" TEXT,
    "destEmail" TEXT,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validezDias" INTEGER NOT NULL DEFAULT 10,
    "items" JSONB NOT NULL DEFAULT '[]',
    "descuento" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "datosBancarios" TEXT,
    "firmaDataUrl" TEXT,
    "firmante" TEXT,
    "esPlantilla" BOOLEAN NOT NULL DEFAULT false,
    "nombrePlantilla" TEXT,
    "creadoPor" TEXT NOT NULL,
    "actualizadoPor" TEXT,
    "emitidoEl" TIMESTAMP(3),
    "emitidoPor" TEXT,
    "anuladoEl" TIMESTAMP(3),
    "anuladoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Presupuesto_anio_numero_key" ON "Presupuesto"("anio", "numero");
CREATE INDEX "Presupuesto_estado_idx" ON "Presupuesto"("estado");
CREATE INDEX "Presupuesto_esPlantilla_idx" ON "Presupuesto"("esPlantilla");
CREATE INDEX "Presupuesto_clienteId_idx" ON "Presupuesto"("clienteId");

-- AddForeignKey
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Presupuesto" ADD CONSTRAINT "Presupuesto_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
