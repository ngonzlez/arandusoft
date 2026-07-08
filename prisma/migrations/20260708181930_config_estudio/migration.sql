-- AlterTable
ALTER TABLE "Licencia" ADD COLUMN     "dominio" TEXT,
ADD COLUMN     "moduloJuridicoHabilitado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nombreEstudio" TEXT NOT NULL DEFAULT 'Mi Estudio';

