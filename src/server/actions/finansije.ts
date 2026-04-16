"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createTransaction(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const type = formData.get("type") as string
  const amount = parseFloat(formData.get("amount") as string)
  const description = formData.get("description") as string
  const date = formData.get("date") as string
  const categoryId = formData.get("categoryId") as string
  const referenceNum = formData.get("referenceNum") as string
  const notes = formData.get("notes") as string

  if (!type || !amount || !description || !date) {
    throw new Error("Popunite obavezna polja")
  }

  await db.transaction.create({
    data: {
      type: type as "INCOME" | "EXPENSE",
      amount,
      description,
      date: new Date(date),
      categoryId: categoryId || null,
      referenceNum: referenceNum || null,
      notes: notes || null,
      createdById: session.user.id,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/finansije")
  redirect("/dashboard/finansije")
}

export async function updateTransaction(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const type = formData.get("type") as string
  const amount = parseFloat(formData.get("amount") as string)
  const description = formData.get("description") as string
  const date = formData.get("date") as string
  const categoryId = formData.get("categoryId") as string
  const referenceNum = formData.get("referenceNum") as string
  const notes = formData.get("notes") as string

  await db.transaction.update({
    where: { id },
    data: {
      type: type as "INCOME" | "EXPENSE",
      amount,
      description,
      date: new Date(date),
      categoryId: categoryId || null,
      referenceNum: referenceNum || null,
      notes: notes || null,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/finansije")
  redirect("/dashboard/finansije")
}

export async function deleteTransaction(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.transaction.delete({ where: { id } })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/finansije")
  redirect("/dashboard/finansije")
}
