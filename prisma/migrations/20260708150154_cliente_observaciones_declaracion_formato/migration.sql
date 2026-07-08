-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "observaciones" TEXT;

-- AlterTable
ALTER TABLE "Declaracion" ADD COLUMN     "archivoFormato" TEXT NOT NULL DEFAULT 'pdf';

