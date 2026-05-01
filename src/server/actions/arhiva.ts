"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import {
  uploadFile,
  deleteFile,
  resolveTargetFolder,
} from "@/lib/drive"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type ArchiveCategory =
  | "MINUTES"
  | "CONTRACT"
  | "INVOICE"
  | "REPORT"
  | "REGULATION"
  | "OTHER"

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export async function uploadDocument(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const category = formData.get("category") as string
  const yearRaw = formData.get("year") as string
  const file = formData.get("file") as File | null

  if (!title || !category || !file || file.size === 0) {
    throw new Error("Popunite obavezna polja i izaberite fajl")
  }

  const year = Number.parseInt(yearRaw, 10)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Unesite validnu godinu")
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Fajl je veci od 20MB")
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Tip fajla nije podrzan")
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const { folderId } = await resolveTargetFolder({
    category,
    year,
    fileName: file.name,
  })

  const { fileId } = await uploadFile({
    parentFolderId: folderId,
    fileName: file.name,
    mimeType: file.type,
    buffer,
  })

  await db.archiveDocument.create({
    data: {
      title,
      description: description || null,
      category: category as ArchiveCategory,
      year,
      fileName: file.name,
      fileId,
      fileSize: file.size,
      mimeType: file.type,
      uploadedById: session.user.id,
    },
  })

  revalidatePath("/dashboard/arhiva")
  redirect("/dashboard/arhiva")
}

export async function deleteDocument(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const doc = await db.archiveDocument.findUnique({ where: { id } })
  if (!doc) throw new Error("Dokument ne postoji")

  try {
    await deleteFile(doc.fileId)
  } catch {
    // ignore — file may already be missing on Drive
  }

  await db.archiveDocument.delete({ where: { id } })

  revalidatePath("/dashboard/arhiva")
}
