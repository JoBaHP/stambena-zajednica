-- CreateEnum
CREATE TYPE "ArchiveCategory" AS ENUM ('MINUTES', 'CONTRACT', 'INVOICE', 'REPORT', 'REGULATION', 'OTHER');

-- CreateTable
CREATE TABLE "ArchiveDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ArchiveCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchiveDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchiveDocument_category_idx" ON "ArchiveDocument"("category");

-- CreateIndex
CREATE INDEX "ArchiveDocument_createdAt_idx" ON "ArchiveDocument"("createdAt");

-- AddForeignKey
ALTER TABLE "ArchiveDocument" ADD CONSTRAINT "ArchiveDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
