"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notifyAllResidents } from "@/lib/notifications"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import Groq from "groq-sdk"

export async function generateAnnouncementText(title: string, priority: string): Promise<string> {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") throw new Error("Nemate dozvolu")
  if (!title.trim()) throw new Error("Unesite naslov pre generisanja teksta")

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY nije postavljen")

  const client = new Groq({ apiKey })
  const isUrgent = priority === "URGENT"

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content:
          "Ti si upravnik stambene zajednice Pasterova 16 u Srbiji. Pišeš kratka, jasna i profesionalna obaveštenja za stanare na srpskom jeziku (ekavica). Bez pozdrava ni potpisa — samo tekst obaveštenja. Maksimalno 5 rečenica.",
      },
      {
        role: "user",
        content: `Napiši tekst obaveštenja za stanare na osnovu naslova: "${title}".${isUrgent ? " Obaveštenje je hitno." : ""}`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? ""
}

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

  const subjectPrefix = priority === "URGENT" ? "HITNO: " : ""
  await notifyAllResidents({
    subject: `[Pasterova 16] ${subjectPrefix}${title}`,
    body: `${title}\n\n${body}\n\nVidi: ${process.env.NEXTAUTH_URL ?? ""}/dashboard/obavestenja`,
    smsBody: `Pasterova 16${priority === "URGENT" ? " HITNO" : ""}: ${title}. Vidi obavestenja u aplikaciji.`,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/obavestenja")
  redirect("/dashboard/obavestenja")
}

export async function updateAnnouncement(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const body = formData.get("body") as string
  const priority = formData.get("priority") as string
  const isPinned = formData.get("isPinned") === "on"
  const expiresAt = formData.get("expiresAt") as string

  await db.announcement.update({
    where: { id },
    data: {
      title,
      body,
      priority: priority as "NORMAL" | "URGENT",
      isPinned,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
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
