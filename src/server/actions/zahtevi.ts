"use server"

import { after } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { readTriage, triageRequest } from "@/lib/ai-triage"
import { findOrCreateFolder, uploadFile } from "@/lib/drive"
import { scheduleMirror } from "@/lib/drive-mirror/schedule"
import { sanitizeFileName, yearOf } from "@/lib/drive-mirror/format"
import { notifyManagers, notifyUsers } from "@/lib/notifications"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Fotografije se u pretrazivacu smanjuju pre slanja, pa je ovo samo zastita od
// zaobilazenja forme. Vercel ionako odbija telo zahteva prek 4.5 MB.
const MAX_PHOTOS = 5
const MAX_PHOTO_BYTES = 3 * 1024 * 1024
const MAX_TOTAL_BYTES = 4 * 1024 * 1024
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Salje fotografije uz zahtev na Drive i vezuje ih za zapis.
 * Neuspeh se ne prosledjuje dalje — prijavljen kvar je vazniji od priloga.
 */
async function attachPhotos(requestId: string, title: string, photos: File[]) {
  const archiveRoot = process.env.GDRIVE_ARCHIVE_FOLDER_ID
  if (!archiveRoot || photos.length === 0) return

  try {
    const year = yearOf(new Date())
    const zahteviFolder = await findOrCreateFolder("Zahtevi", archiveRoot)
    const yearFolder = await findOrCreateFolder(String(year), zahteviFolder)
    const photoFolder = await findOrCreateFolder("Fotografije", yearFolder)
    const base = sanitizeFileName(title, "zahtev")

    let index = 0
    for (const photo of photos) {
      index++
      const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg"
      const fileName = `${base}_${requestId.slice(-6)}_${index}.${ext}`
      const buffer = Buffer.from(await photo.arrayBuffer())

      const { fileId } = await uploadFile({
        parentFolderId: photoFolder,
        fileName,
        mimeType: photo.type,
        buffer,
      })

      await db.document.create({
        data: {
          name: fileName,
          fileId,
          size: buffer.length,
          mimeType: photo.type,
          requestId,
        },
      })
    }
  } catch (err) {
    console.error("[zahtevi] slanje fotografija nije uspelo", { requestId, err })
  }
}

export async function createRequest(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Niste prijavljeni")

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const category = formData.get("category") as string
  const priority = formData.get("priority") as string
  const location = formData.get("location") as string

  if (!title || !description || !category) {
    throw new Error("Popunite obavezna polja")
  }

  const photos = formData
    .getAll("photo")
    .filter((p): p is File => p instanceof File && p.size > 0)

  if (photos.length > MAX_PHOTOS) {
    throw new Error(`Najvise ${MAX_PHOTOS} fotografije po zahtevu`)
  }
  if (photos.some((p) => !PHOTO_TYPES.includes(p.type))) {
    throw new Error("Dozvoljene su samo slike (JPG, PNG, WebP)")
  }
  if (photos.some((p) => p.size > MAX_PHOTO_BYTES)) {
    throw new Error("Fotografija je prevelika")
  }
  if (photos.reduce((sum, p) => sum + p.size, 0) > MAX_TOTAL_BYTES) {
    throw new Error("Fotografije su zajedno prevelike — posaljite ih manje")
  }

  const created = await db.maintenanceRequest.create({
    data: {
      title,
      description,
      category: category as "PLUMBING" | "ELECTRICAL" | "ELEVATOR" | "HEATING" | "CLEANING" | "STRUCTURAL" | "OTHER",
      priority: (priority as "LOW" | "NORMAL" | "HIGH" | "URGENT") ?? "NORMAL",
      location: location || null,
      reporterId: session.user.id,
    },
  })

  await attachPhotos(created.id, title, photos)

  // Trijaza ide posle odgovora — stanar ne ceka model. Dokument na Drive-u se
  // osvezava tek posle nje, da predlog udje u zapis.
  after(async () => {
    await triageRequest(created.id)
  })

  scheduleMirror("REQUEST", created.id)

  const isUrgent = created.priority === "URGENT"
  await notifyManagers({
    subject: `[Pasterova 16] ${isUrgent ? "HITAN " : ""}Novi zahtev: ${title}`,
    body: `Stanar ${session.user.name ?? ""} je prijavio novi zahtev za intervenciju.\n\nNaslov: ${title}\nKategorija: ${category}\nPrioritet: ${created.priority}\n\n${description}\n\nVidi: ${process.env.APP_URL ?? ""}/dashboard/zahtevi/${created.id}`,
    smsBody: `Pasterova 16: ${isUrgent ? "HITAN " : ""}novi zahtev "${title}" od ${session.user.name ?? "stanara"}.`,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/zahtevi")
  redirect("/dashboard/zahtevi")
}

export async function updateRequestStatus(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const status = formData.get("status") as string
  const resolution = formData.get("resolution") as string

  const updated = await db.maintenanceRequest.update({
    where: { id },
    data: {
      status: status as "SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "REJECTED",
      resolution: resolution || null,
      resolvedAt: status === "RESOLVED" || status === "REJECTED" ? new Date() : null,
    },
  })

  scheduleMirror("REQUEST", id)

  const statusLabels: Record<string, string> = {
    SUBMITTED: "Prijavljeno",
    IN_PROGRESS: "U toku",
    RESOLVED: "Reseno",
    REJECTED: "Odbijeno",
  }

  await notifyUsers([updated.reporterId], {
    subject: `[Pasterova 16] Status zahteva: ${updated.title}`,
    body: `Status vaseg zahteva "${updated.title}" je promenjen na: ${statusLabels[updated.status]}.\n\n${resolution ? `Komentar upravnika:\n${resolution}\n\n` : ""}Vidi: ${process.env.APP_URL ?? ""}/dashboard/zahtevi/${updated.id}`,
    smsBody: `Pasterova 16: vas zahtev "${updated.title}" je sada ${statusLabels[updated.status]}.`,
  })

  revalidatePath("/dashboard/zahtevi")
  revalidatePath(`/dashboard/zahtevi/${id}`)
}

/** Upravnik prihvata predlog AI trijaze — tek tad se zapis stvarno menja. */
export async function applyTriage(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const request = await db.maintenanceRequest.findUnique({
    where: { id },
    select: { aiTriage: true },
  })
  const triage = readTriage(request?.aiTriage)
  if (!triage) throw new Error("Nema predloga za primenu")

  await db.maintenanceRequest.update({
    where: { id },
    data: {
      ...(triage.category
        ? { category: triage.category as "PLUMBING" | "ELECTRICAL" | "ELEVATOR" | "HEATING" | "CLEANING" | "STRUCTURAL" | "OTHER" }
        : {}),
      ...(triage.priority
        ? { priority: triage.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT" }
        : {}),
    },
  })

  scheduleMirror("REQUEST", id)

  revalidatePath("/dashboard/zahtevi")
  revalidatePath(`/dashboard/zahtevi/${id}`)
}

export async function addComment(requestId: string, formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Niste prijavljeni")

  const body = formData.get("body") as string
  if (!body) throw new Error("Komentar ne moze biti prazan")

  await db.requestComment.create({
    data: {
      requestId,
      authorId: session.user.id,
      body,
    },
  })

  scheduleMirror("REQUEST", requestId)

  revalidatePath(`/dashboard/zahtevi/${requestId}`)
}

export async function deleteRequest(id: string) {
  const session = await auth()
  if (!session) throw new Error("Niste prijavljeni")

  const request = await db.maintenanceRequest.findUnique({ where: { id } })
  if (!request) throw new Error("Zahtev ne postoji")

  if (session.user.role !== "MANAGER" && request.reporterId !== session.user.id) {
    throw new Error("Nemate dozvolu")
  }

  await db.maintenanceRequest.delete({ where: { id } })

  scheduleMirror("REQUEST", id)

  revalidatePath("/dashboard/zahtevi")
  redirect("/dashboard/zahtevi")
}
