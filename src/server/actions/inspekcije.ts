"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { scheduleMirror } from "@/lib/drive-mirror/schedule"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createInspection(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const title = formData.get("title") as string
  const inspectionDate = formData.get("inspectionDate") as string
  const nextDueDate = formData.get("nextDueDate") as string
  const result = formData.get("result") as string
  const inspector = formData.get("inspector") as string
  const notes = formData.get("notes") as string

  if (!title || !inspectionDate || !result) {
    throw new Error("Попуните обавезна поља")
  }

  const created = await db.pPInspection.create({
    data: {
      title,
      inspectionDate: new Date(inspectionDate),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      result: result as "PASSED" | "FAILED" | "CONDITIONAL",
      inspector: inspector || null,
      notes: notes || null,
    },
  })

  scheduleMirror("INSPECTION", created.id)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/inspekcije")
  redirect("/dashboard/inspekcije")
}

export async function updateInspection(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const title = formData.get("title") as string
  const inspectionDate = formData.get("inspectionDate") as string
  const nextDueDate = formData.get("nextDueDate") as string
  const result = formData.get("result") as string
  const inspector = formData.get("inspector") as string
  const notes = formData.get("notes") as string

  await db.pPInspection.update({
    where: { id },
    data: {
      title,
      inspectionDate: new Date(inspectionDate),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      result: result as "PASSED" | "FAILED" | "CONDITIONAL",
      inspector: inspector || null,
      notes: notes || null,
    },
  })

  scheduleMirror("INSPECTION", id)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/inspekcije")
  redirect("/dashboard/inspekcije")
}

export async function deleteInspection(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  await db.pPInspection.delete({ where: { id } })

  scheduleMirror("INSPECTION", id)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/inspekcije")
  redirect("/dashboard/inspekcije")
}
