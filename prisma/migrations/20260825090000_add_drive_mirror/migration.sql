-- CreateTable
CREATE TABLE "DriveMirror" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileId" TEXT,
    "fileName" TEXT,
    "folderId" TEXT,
    "contentHash" TEXT,
    "syncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveMirror_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriveMirror_entity_idx" ON "DriveMirror"("entity");

-- CreateIndex
CREATE UNIQUE INDEX "DriveMirror_entity_entityId_key" ON "DriveMirror"("entity", "entityId");
