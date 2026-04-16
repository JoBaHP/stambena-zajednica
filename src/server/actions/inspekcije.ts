"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createInspection(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const inspectionDate = formData.get("inspectionDate") as string
  const nextDueDate = formData.get("nextDueDate") as string
  const result = formData.get("result") as string
  const inspector = formData.get("inspector") as string
  const notes = formData.get("notes") as string

  if (!title || !inspectionDate || !result) {
    throw new Error("Popunite obavezna polja")
  }

  await db.pPInspection.create({
    data: {
      title,
      inspectionDate: new Date(inspectionDate),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      result: result as "PASSED" | "FAILED" | "CONDITIONAL",
      inspector: inspector || null,
      notes: notes || null,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/inspekcije")
  redirect("/dashboard/inspekcije")
}

export async function deleteInspection(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.pPInspection.delete({ where: { id } })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/inspekcije")
  redirect("/dashboard/inspekcije")
}
