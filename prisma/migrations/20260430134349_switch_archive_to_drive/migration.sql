/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `ArchiveDocument` table. All the data in the column will be lost.
  - Added the required column `fileId` to the `ArchiveDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `ArchiveDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArchiveDocument" DROP COLUMN "fileUrl",
ADD COLUMN     "fileId" TEXT NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;
