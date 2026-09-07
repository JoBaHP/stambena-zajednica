"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function changePassword(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Нисте пријављени")

  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Попуните сва поља" }
  }

  if (newPassword.length < 6) {
    return { error: "Нова лозинка мора имати бар 6 карактера" }
  }

  if (newPassword !== confirmPassword) {
    return { error: "Лозинке се не поклапају" }
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return { error: "Корисник није пронађен" }

  const validPassword = await bcrypt.compare(currentPassword, user.password)
  if (!validPassword) {
    return { error: "Тренутна лозинка није тачна" }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await db.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  })

  revalidatePath("/dashboard/podesavanja")
  return { success: true }
}

export async function updateNotificationPreferences(formData: FormData) {
  const session = await auth()
  if (!session) return { error: "Нисте пријављени" }

  const notifyEmail = formData.get("notifyEmail") === "on"
  const phone = (formData.get("phone") as string)?.trim() || null

  await db.user.update({
    where: { id: session.user.id },
    data: { notifyEmail, phone },
  })

  revalidatePath("/dashboard/podesavanja")
  return { success: true }
}
