-- Features por estudio (reemplaza el boolean moduloJuridicoHabilitado, que queda deprecado)
ALTER TABLE "Licencia" ADD COLUMN "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: estudios con el módulo jurídico prendido conservan la feature
UPDATE "Licencia" SET "features" = ARRAY['juridico'] WHERE "moduloJuridicoHabilitado" = true;
