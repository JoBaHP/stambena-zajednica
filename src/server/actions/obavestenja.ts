"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createAnnouncement(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const body = formData.get("body") as string
  const priority = formData.get("priority") as string
  const isPinned = formData.get("isPinned") === "on"
  const expiresAt = formData.get("expiresAt") as string

  if (!title || !body) {
    throw new Error("Popunite obavezna polja")
  }

  await db.announcement.create({
    data: {
      title,
      body,
      priority: priority as "NORMAL" | "URGENT",
      isPinned,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      authorId: session.user.id,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/obavestenja")
  redirect("/dashboard/obavestenja")
}

export async function deleteAnnouncement(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.announcement.delete({ where: { id } })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/obavestenja")
  redirect("/dashboard/obavestenja")
}
