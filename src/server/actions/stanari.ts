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
