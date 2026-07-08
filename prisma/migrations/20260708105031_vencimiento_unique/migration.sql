-- CreateIndex
CREATE UNIQUE INDEX "Vencimiento_clienteId_tipo_fechaVencimiento_key" ON "Vencimiento"("clienteId", "tipo", "fechaVencimiento");

