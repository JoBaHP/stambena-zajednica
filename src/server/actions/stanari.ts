"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export async function createResident(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string
  const unit = formData.get("unit") as string
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    throw new Error("Popunite obavezna polja")
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("Korisnik sa ovim email-om vec postoji")
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      unit: unit || null,
      password: hashedPassword,
      role: "RESIDENT",
    },
  })

  revalidatePath("/dashboard/stanari")
  redirect("/dashboard/stanari")
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) throw new Error("Korisnik ne postoji")

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const phone = (formData.get("phone") as string)?.trim()
  const unit = (formData.get("unit") as string)?.trim()
  const role = formData.get("role") as "MANAGER" | "RESIDENT"

  if (!name || !email) {
    throw new Error("Ime i email su obavezni")
  }
  if (role !== "MANAGER" && role !== "RESIDENT") {
    throw new Error("Nevazeca uloga")
  }

  if (session.user.id === id && role !== target.role) {
    throw new Error("Ne mozete promeniti svoju ulogu")
  }

  if (email !== target.email) {
    const taken = await db.user.findUnique({ where: { email } })
    if (taken) throw new Error("Email je vec u upotrebi")
  }

  await db.user.update({
    where: { id },
    data: {
      name,
      email,
      phone: phone || null,
      unit: unit || null,
      role,
    },
  })

  revalidatePath("/dashboard/stanari")
  revalidatePath(`/dashboard/stanari/${id}`)
}

export async function resetUserPassword(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) throw new Error("Korisnik ne postoji")

  const password = formData.get("password") as string
  if (!password || password.length < 6) {
    throw new Error("Lozinka mora imati najmanje 6 karaktera")
  }

  const hashed = await bcrypt.hash(password, 12)
  await db.user.update({ where: { id }, data: { password: hashed } })

  revalidatePath(`/dashboard/stanari/${id}`)
}

export async function setUserActive(id: string, active: boolean) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  if (session.user.id === id && !active) {
    throw new Error("Ne mozete sebi ukloniti pristup")
  }

  const target = await db.user.findUnique({ where: { id } })
  if (!target) throw new Error("Korisnik ne postoji")

  await db.user.update({ where: { id }, data: { active } })

  revalidatePath("/dashboard/stanari")
  revalidatePath(`/dashboard/stanari/${id}`)
}
