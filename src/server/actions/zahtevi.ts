"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notifyManagers, notifyUsers } from "@/lib/notifications"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

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

  revalidatePath("/dashboard/zahtevi")
  redirect("/dashboard/zahtevi")
}
