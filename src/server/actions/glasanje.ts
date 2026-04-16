"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createPoll(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const endsAt = formData.get("endsAt") as string
  const options = formData.getAll("option") as string[]
  const status = formData.get("status") as string

  if (!title || options.filter(Boolean).length < 2) {
    throw new Error("Unesite naslov i bar dve opcije")
  }

  await db.poll.create({
    data: {
      title,
      description: description || null,
      status: (status as "DRAFT" | "ACTIVE") ?? "DRAFT",
      startsAt: status === "ACTIVE" ? new Date() : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      createdById: session.user.id,
      options: {
        create: options.filter(Boolean).map((text) => ({ text })),
      },
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/glasanje")
  redirect("/dashboard/glasanje")
}

export async function castVote(pollId: string, optionId: string) {
  const session = await auth()
  if (!session) throw new Error("Niste prijavljeni")

  const poll = await db.poll.findUnique({ where: { id: pollId } })
  if (!poll || poll.status !== "ACTIVE") {
    throw new Error("Glasanje nije aktivno")
  }

  if (poll.endsAt && poll.endsAt < new Date()) {
    throw new Error("Glasanje je isteklo")
  }

  const existingVote = await db.vote.findUnique({
    where: { pollId_voterId: { pollId, voterId: session.user.id } },
  })

  if (existingVote) {
    throw new Error("Vec ste glasali")
  }

  await db.vote.create({
    data: {
      pollId,
      optionId,
      voterId: session.user.id,
    },
  })

  revalidatePath(`/dashboard/glasanje/${pollId}`)
}

export async function closePoll(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.poll.update({
    where: { id },
    data: { status: "CLOSED" },
  })

  revalidatePath("/dashboard/glasanje")
  revalidatePath(`/dashboard/glasanje/${id}`)
}

export async function activatePoll(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  await db.poll.update({
    where: { id },
    data: { status: "ACTIVE", startsAt: new Date() },
  })

  revalidatePath("/dashboard/glasanje")
  revalidatePath(`/dashboard/glasanje/${id}`)
}
