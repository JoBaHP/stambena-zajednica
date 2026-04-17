"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function changePassword(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Niste prijavljeni")

  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Popunite sva polja" }
  }

  if (newPassword.length < 6) {
    return { error: "Nova lozinka mora imati bar 6 karaktera" }
  }

  if (newPassword !== confirmPassword) {
    return { error: "Lozinke se ne poklapaju" }
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return { error: "Korisnik nije pronadjen" }

  const validPassword = await bcrypt.compare(currentPassword, user.password)
  if (!validPassword) {
    return { error: "Trenutna lozinka nije tacna" }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await db.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  })

  revalidatePath("/dashboard/podesavanja")
  return { success: true }
}
