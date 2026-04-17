"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createContact(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const name = formData.get("name") as string
  const phone = formData.get("phone") as string
  const category = formData.get("category") as string
  const note = formData.get("note") as string

  if (!name || !phone || !category) {
    throw new Error("Popunite obavezna polja")
  }

  await db.contact.create({
    data: {
      name,
      phone,
      category: category as "EMERGENCY" | "MANAGEMENT" | "MAINTENANCE",
      note: note || null,
    },
  })

  revalidatePath("/dashboard/kontakti")
  redirect("/dashboard/kontakti")
}

export async function updateContact(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const name = formData.get("name") as string
  const phone = formData.get("phone") as string
  const category = formData.get("category") as string
  const note = formData.get("note") as string

  await db.contact.update({
    where: { id },
    data: {
      name,
      phone,
      category: category as "EMERGENCY" | "MANAGEMENT" | "MAINTENANCE",
      note: note || null,
    },
  })

  revalidatePath("/dashboard/kontakti")
  redirect("/dashboard/kontakti")
}

export async function deleteContact(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.contact.delete({ where: { id } })

  revalidatePath("/dashboard/kontakti")
  redirect("/dashboard/kontakti")
}
