"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { notifyManagers, sendDirectEmail } from "@/lib/notifications"

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export async function createAccessRequest(formData: FormData) {
  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const phone = (formData.get("phone") as string)?.trim() || null
  const unit = (formData.get("unit") as string)?.trim() || null
  const message = (formData.get("message") as string)?.trim() || null

  if (!name || !email) {
    return { error: "Име и емаил су обавезни" }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Формат емаила није исправан" }
  }

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return {
      error:
        "Већ постоји налог са овим емаилом. Пробај пријаву или ресет лозинке.",
    }
  }

  const existingPending = await db.accessRequest.findFirst({
    where: { email, status: "PENDING" },
  })
  if (existingPending) {
    return {
      error:
        "Већ постоји захтев за овај емаил који чека одобрење управника.",
    }
  }

  let unitOccupant: { name: string; email: string } | null = null
  if (unit) {
    const occupant = await db.user.findFirst({
      where: { unit, active: true },
      select: { name: true, email: true },
    })
    if (occupant) unitOccupant = occupant
  }

  await db.accessRequest.create({
    data: { name, email, phone, unit, message },
  })

  const unitNote = unit ? `\nStan: ${unit}` : ""
  const phoneNote = phone ? `\nTelefon: ${phone}` : ""
  const messageNote = message ? `\nPoruka: ${message}` : ""
  const occupantNote = unitOccupant
    ? `\n\nУПОЗОРЕЊЕ: Стан ${unit} већ има активног корисника: ${unitOccupant.name} (${unitOccupant.email}). Провери пре одобрења.`
    : ""

  await notifyManagers({
    subject: "Нови захтев за приступ",
    body: `${name} (${email}) је затражио приступ порталу.${unitNote}${phoneNote}${messageNote}${occupantNote}\n\nПрегледај захтев: ${APP_URL}/dashboard/zahtevi-za-pristup`,
  })

  return {
    success: true,
    unitOccupied: !!unitOccupant,
    unit: unit ?? null,
  }
}

export async function approveAccessRequest(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const req = await db.accessRequest.findUnique({ where: { id } })
  if (!req) throw new Error("Захтев не постоји")
  if (req.status !== "PENDING") {
    throw new Error("Захтев је већ обрађен")
  }

  const password = (formData.get("password") as string)?.trim()
  if (!password || password.length < 6) {
    throw new Error("Лозинка мора имати најмање 6 карактера")
  }

  const existing = await db.user.findUnique({ where: { email: req.email } })
  if (existing) {
    throw new Error(
      "Корисник са овим емаилом већ постоји у систему. Одбиј захтев.",
    )
  }

  const hashed = await bcrypt.hash(password, 12)

  await db.$transaction([
    db.user.create({
      data: {
        name: req.name,
        email: req.email,
        phone: req.phone,
        unit: req.unit,
        password: hashed,
        role: "RESIDENT",
      },
    }),
    db.accessRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    }),
  ])

  await sendDirectEmail(
    req.email,
    "Приступ одобрен — Пастерова 16",
    `Поштовани ${req.name},\n\nВаш захтев за приступ порталу је одобрен.\n\nПодаци за пријаву:\nЕмаил: ${req.email}\nЛозинка: ${password}\n\nПријави се: ${APP_URL}/login\n\nПрепоручујемо да промениш лозинку након прве пријаве (Подешавања → Лозинка).`,
  )

  revalidatePath("/dashboard/zahtevi-za-pristup")
  revalidatePath("/dashboard/stanari")
  return { name: req.name, email: req.email, password }
}

export async function rejectAccessRequest(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const req = await db.accessRequest.findUnique({ where: { id } })
  if (!req) throw new Error("Захтев не постоји")
  if (req.status !== "PENDING") {
    throw new Error("Захтев је већ обрађен")
  }

  const note = (formData.get("note") as string)?.trim() || null

  await db.accessRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewNote: note,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  })

  const noteLine = note ? `\n\nНапомена управника: ${note}` : ""
  await sendDirectEmail(
    req.email,
    "Захтев за приступ одбијен — Пастерова 16",
    `Поштовани ${req.name},\n\nВаш захтев за приступ порталу је одбијен.${noteLine}\n\nАко мислите да је дошло до грешке, контактирајте управника.`,
  )

  revalidatePath("/dashboard/zahtevi-za-pristup")
}
