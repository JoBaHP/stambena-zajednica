"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type TaskCategory =
  | "INSPECTION"
  | "MAINTENANCE"
  | "PAYMENT"
  | "MEETING"
  | "CONTRACT"
  | "OTHER"
type TaskRecurrence = "NONE" | "MONTHLY" | "QUARTERLY" | "YEARLY"

function nextDueDate(date: Date, recurrence: TaskRecurrence): Date | null {
  const next = new Date(date)
  switch (recurrence) {
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1)
      return next
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3)
      return next
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1)
      return next
    default:
      return null
  }
}

export async function createTask(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const dueDate = formData.get("dueDate") as string
  const category = formData.get("category") as string
  const recurrence = formData.get("recurrence") as string

  if (!title || !dueDate || !category) {
    throw new Error("Popunite obavezna polja")
  }

  await db.task.create({
    data: {
      title,
      description: description || null,
      dueDate: new Date(dueDate),
      category: category as TaskCategory,
      recurrence: (recurrence as TaskRecurrence) ?? "NONE",
      createdById: session.user.id,
    },
  })

  revalidatePath("/dashboard/kalendar")
  revalidatePath("/dashboard")
  redirect("/dashboard/kalendar")
}

export async function updateTask(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const dueDate = formData.get("dueDate") as string
  const category = formData.get("category") as string
  const recurrence = formData.get("recurrence") as string

  await db.task.update({
    where: { id },
    data: {
      title,
      description: description || null,
      dueDate: new Date(dueDate),
      category: category as TaskCategory,
      recurrence: (recurrence as TaskRecurrence) ?? "NONE",
    },
  })

  revalidatePath("/dashboard/kalendar")
  revalidatePath(`/dashboard/kalendar/${id}/uredi`)
  redirect("/dashboard/kalendar")
}

export async function completeTask(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const task = await db.task.findUnique({ where: { id } })
  if (!task) throw new Error("Obaveza ne postoji")

  await db.task.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  })

  if (task.recurrence !== "NONE") {
    const next = nextDueDate(task.dueDate, task.recurrence)
    if (next) {
      await db.task.create({
        data: {
          title: task.title,
          description: task.description,
          dueDate: next,
          category: task.category,
          recurrence: task.recurrence,
          createdById: session.user.id,
        },
      })
    }
  }

  revalidatePath("/dashboard/kalendar")
  revalidatePath("/dashboard")
}

export async function reopenTask(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.task.update({
    where: { id },
    data: {
      status: "PENDING",
      completedAt: null,
    },
  })

  revalidatePath("/dashboard/kalendar")
  revalidatePath("/dashboard")
}

export async function deleteTask(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.task.delete({ where: { id } })

  revalidatePath("/dashboard/kalendar")
  revalidatePath("/dashboard")
  redirect("/dashboard/kalendar")
}
