-- Veza stavke sa redom u tabeli "Troskovi stambene zajednice" na Drive-u
-- ("<KARTICA>/<redni broj>"), da ponovni uvoz azurira postojecu stavku
-- umesto da napravi duplikat.
ALTER TABLE "Transaction" ADD COLUMN "sourceRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_sourceRef_key" ON "Transaction"("sourceRef");
