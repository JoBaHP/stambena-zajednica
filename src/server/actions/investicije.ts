"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createInvestment(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const budget = parseFloat(formData.get("budget") as string)
  const status = formData.get("status") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string

  if (!title || !budget) {
    throw new Error("Popunite obavezna polja")
  }

  await db.investment.create({
    data: {
      title,
      description: description || null,
      budget,
      status: (status as "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") ?? "PLANNED",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/investicije")
  redirect("/dashboard/investicije")
}

export async function updateInvestment(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const budget = parseFloat(formData.get("budget") as string)
  const spent = parseFloat(formData.get("spent") as string)
  const status = formData.get("status") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string

  await db.investment.update({
    where: { id },
    data: {
      title,
      description: description || null,
      budget,
      spent: spent || 0,
      status: status as "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/investicije")
  redirect("/dashboard/investicije")
}

export async function updateInvestmentSpent(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const spent = parseFloat(formData.get("spent") as string)
  const status = formData.get("status") as string

  await db.investment.update({
    where: { id },
    data: {
      spent,
      ...(status && { status: status as "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }),
    },
  })

  revalidatePath("/dashboard/investicije")
  revalidatePath(`/dashboard/investicije/${id}`)
}

export async function deleteInvestment(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.investment.delete({ where: { id } })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/investicije")
  redirect("/dashboard/investicije")
}
