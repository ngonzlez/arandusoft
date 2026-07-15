-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoVencimiento" ADD VALUE 'TIMBRADO';
ALTER TYPE "TipoVencimiento" ADD VALUE 'FIRMA_DIGITAL';

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "firmaDigitalVencimiento" TIMESTAMP(3),
ADD COLUMN     "timbradoNumero" TEXT,
ADD COLUMN     "timbradoVencimiento" TIMESTAMP(3);

