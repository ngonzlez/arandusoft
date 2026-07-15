-- DropForeignKey
ALTER TABLE "Expediente" DROP CONSTRAINT "Expediente_clienteId_fkey";

-- AlterTable
ALTER TABLE "Expediente" ADD COLUMN     "anio" INTEGER,
ADD COLUMN     "ciudadId" TEXT,
ADD COLUMN     "juzgadoId" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "secretariaId" TEXT,
ALTER COLUMN "clienteId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ciudad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "departamentoId" TEXT NOT NULL,

    CONSTRAINT "Ciudad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Juzgado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "circunscripcion" TEXT,
    "fuero" TEXT,
    "juezActual" TEXT,
    "ubicacion" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Juzgado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secretaria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "juzgadoId" TEXT NOT NULL,
    "actuario" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Secretaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nombre_key" ON "Departamento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Ciudad_departamentoId_nombre_key" ON "Ciudad"("departamentoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Juzgado_nombre_circunscripcion_key" ON "Juzgado"("nombre", "circunscripcion");

-- CreateIndex
CREATE UNIQUE INDEX "Secretaria_juzgadoId_nombre_key" ON "Secretaria"("juzgadoId", "nombre");

-- CreateIndex
CREATE INDEX "Expediente_anio_numero_idx" ON "Expediente"("anio", "numero");

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_ciudadId_fkey" FOREIGN KEY ("ciudadId") REFERENCES "Ciudad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_juzgadoId_fkey" FOREIGN KEY ("juzgadoId") REFERENCES "Juzgado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ciudad" ADD CONSTRAINT "Ciudad_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secretaria" ADD CONSTRAINT "Secretaria_juzgadoId_fkey" FOREIGN KEY ("juzgadoId") REFERENCES "Juzgado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

