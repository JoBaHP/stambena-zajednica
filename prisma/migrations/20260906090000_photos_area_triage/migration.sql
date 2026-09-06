-- Prilozi uz zapis: fajl na Drive-u + veza sa zahtevom za intervenciju.
-- "url" je zaostao iz vremena Vercel Blob-a; postaje opcion jer novi prilozi
-- koriste "fileId". Tabela je prazna, pa nema sta da se popunjava.
ALTER TABLE "Document" ALTER COLUMN "url" DROP NOT NULL;
ALTER TABLE "Document" ADD COLUMN "fileId" TEXT;
ALTER TABLE "Document" ADD COLUMN "requestId" TEXT;

-- CreateIndex
CREATE INDEX "Document_requestId_idx" ON "Document"("requestId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Predlog AI trijaze kvara (kategorija, prioritet, izvodjac, obrazlozenje).
ALTER TABLE "MaintenanceRequest" ADD COLUMN "aiTriage" JSONB;

-- Kvadratura stana — osnova za vlasnicki udeo, tezinu glasa i kvorum.
ALTER TABLE "User" ADD COLUMN "area" DECIMAL(8,2);

-- Potreban udeo za donosenje odluke, u procentima ukupnog vlasnickog udela.
ALTER TABLE "Poll" ADD COLUMN "requiredShare" INTEGER NOT NULL DEFAULT 50;
