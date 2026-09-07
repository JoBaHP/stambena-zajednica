"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { scheduleMirror } from "@/lib/drive-mirror/schedule"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

/** Kvadratura stana; prazno polje znaci "није унета", ne nula. */
function parseArea(value: FormDataEntryValue | null): number | null {
  const raw = typeof value === "string" ? value.trim().replace(",", ".") : ""
  if (!raw) return null
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) return null
  return num
}

export async function createResident(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string
  const unit = formData.get("unit") as string
  const area = parseArea(formData.get("area"))
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    throw new Error("Попуните обавезна поља")
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("Корисник са овим емаилом већ постоји")
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      unit: unit || null,
      area,
      password: hashedPassword,
      role: "RESIDENT",
    },
  })

  scheduleMirror("RESIDENT")

  revalidatePath("/dashboard/stanari")
  redirect("/dashboard/stanari")
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) throw new Error("Корисник не постоји")

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const phone = (formData.get("phone") as string)?.trim()
  const unit = (formData.get("unit") as string)?.trim()
  const area = parseArea(formData.get("area"))
  // Kad upravnik uredjuje sam sebe, polje za ulogu je onemoguceno u formi, a
  // onemoguceno polje se ne salje — odsustvo vrednosti znaci "ostavi kako jeste",
  // ne "nevazeca uloga".
  const roleRaw = formData.get("role")
  const role =
    roleRaw === "MANAGER" || roleRaw === "RESIDENT" ? roleRaw : target.role

  if (!name || !email) {
    throw new Error("Име и емаил су обавезни")
  }
  if (roleRaw !== null && roleRaw !== "MANAGER" && roleRaw !== "RESIDENT") {
    throw new Error("Неважећа улога")
  }

  if (session.user.id === id && role !== target.role) {
    throw new Error("Не можете променити своју улогу")
  }

  if (email !== target.email) {
    const taken = await db.user.findUnique({ where: { email } })
    if (taken) throw new Error("Емаил је већ у употреби")
  }

  await db.user.update({
    where: { id },
    data: {
      name,
      email,
      phone: phone || null,
      unit: unit || null,
      area,
      role,
    },
  })

  scheduleMirror("RESIDENT")

  revalidatePath("/dashboard/stanari")
  revalidatePath(`/dashboard/stanari/${id}`)
}

export async function resetUserPassword(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) throw new Error("Корисник не постоји")

  const password = formData.get("password") as string
  if (!password || password.length < 6) {
    throw new Error("Лозинка мора имати најмање 6 карактера")
  }

  const hashed = await bcrypt.hash(password, 12)
  await db.user.update({ where: { id }, data: { password: hashed } })

  revalidatePath(`/dashboard/stanari/${id}`)
}

export async function setUserActive(id: string, active: boolean) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  if (session.user.id === id && !active) {
    throw new Error("Не можете себи уклонити приступ")
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) throw new Error("Корисник не постоји")

  await db.user.update({ where: { id }, data: { active } })

  scheduleMirror("RESIDENT")

  revalidatePath("/dashboard/stanari")
  revalidatePath(`/dashboard/stanari/${id}`)
}
