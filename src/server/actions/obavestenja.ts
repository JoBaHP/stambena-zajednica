"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { GROQ_MODEL } from "@/lib/groq"
import { scheduleMirror } from "@/lib/drive-mirror/schedule"
import { notifyAllResidents } from "@/lib/notifications"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import Groq from "groq-sdk"

export async function generateAnnouncementText(title: string, priority: string): Promise<string> {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") throw new Error("Немате дозволу")
  if (!title.trim()) throw new Error("Унесите наслов пре генерисања текста")

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY није постављен")

  const client = new Groq({ apiKey })
  const isUrgent = priority === "URGENT"

  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    // Rezerva za reasoning modele: oni deo budzeta trose na razmisljanje pre
    // odgovora, pa pretesan limit vrati prazan tekst umesto greske. Duzinu
    // odgovora ogranicava prompt, ne ovaj broj.
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content:
          "Ти си управник стамбене заједнице Пастерова 16 у Србији. Пишеш кратка, јасна и професионална обавештења за станаре искључиво на српском језику, ћириличним писмом, екавицом. Никада не користи латиницу. Без поздрава ни потписа — само текст обавештења. Максимално 5 реченица.",
      },
      {
        role: "user",
        content: `Напиши текст обавештења за станаре на основу наслова: „${title}".${isUrgent ? " Обавештење је хитно." : ""} Пиши искључиво ћирилицом, екавицом.`,
      },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? ""
}

export async function createAnnouncement(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const title = formData.get("title") as string
  const body = formData.get("body") as string
  const priority = formData.get("priority") as string
  const isPinned = formData.get("isPinned") === "on"
  const expiresAt = formData.get("expiresAt") as string

  if (!title || !body) {
    throw new Error("Попуните обавезна поља")
  }

  const created = await db.announcement.create({
    data: {
      title,
      body,
      priority: priority as "NORMAL" | "URGENT",
      isPinned,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      authorId: session.user.id,
    },
  })

  scheduleMirror("ANNOUNCEMENT", created.id)

  const subjectPrefix = priority === "URGENT" ? "ХИТНО: " : ""
  await notifyAllResidents({
    subject: `[Пастерова 16] ${subjectPrefix}${title}`,
    body: `${title}\n\n${body}\n\nВиди: ${process.env.NEXTAUTH_URL ?? ""}/dashboard/obavestenja`,
    smsBody: `Пастерова 16${priority === "URGENT" ? " ХИТНО" : ""}: ${title}. Види обавештења у апликацији.`,
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/obavestenja")
  redirect("/dashboard/obavestenja")
}

export async function updateAnnouncement(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
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

  scheduleMirror("ANNOUNCEMENT", id)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/obavestenja")
  redirect("/dashboard/obavestenja")
}

export async function deleteAnnouncement(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  await db.announcement.delete({ where: { id } })

  // Citljiv dokument na Drive-u ostaje; osvezava se samo JSON snimak modula.
  scheduleMirror("ANNOUNCEMENT", id)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/obavestenja")
  redirect("/dashboard/obavestenja")
}
