-- CreateTable
CREATE TABLE "PerfilEstudio" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT,
    "ruc" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "logoPublicId" TEXT,
    "logoFormato" TEXT,
    "actualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilEstudio_pkey" PRIMARY KEY ("id")
);
