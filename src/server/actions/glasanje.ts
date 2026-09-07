"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { findOrCreateFolder, uploadFile } from "@/lib/drive"
import { scheduleMirror } from "@/lib/drive-mirror/schedule"
import { sanitizeFileName } from "@/lib/drive-mirror/format"
import { formatArea, tallyPoll } from "@/lib/glasanje"

export async function createPoll(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const endsAt = formData.get("endsAt") as string
  const options = formData.getAll("option") as string[]
  const status = formData.get("status") as string
  const requiredShareRaw = Number(formData.get("requiredShare"))
  const requiredShare =
    Number.isFinite(requiredShareRaw) && requiredShareRaw > 0 && requiredShareRaw <= 100
      ? Math.round(requiredShareRaw)
      : 50

  if (!title || options.filter(Boolean).length < 2) {
    throw new Error("Унесите наслов и бар две опције")
  }

  const created = await db.poll.create({
    data: {
      title,
      description: description || null,
      status: (status as "DRAFT" | "ACTIVE") ?? "DRAFT",
      requiredShare,
      startsAt: status === "ACTIVE" ? new Date() : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      createdById: session.user.id,
      options: {
        create: options.filter(Boolean).map((text) => ({ text })),
      },
    },
  })

  scheduleMirror("POLL", created.id)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/glasanje")
  redirect("/dashboard/glasanje")
}

export async function castVote(pollId: string, optionId: string) {
  const session = await auth()
  if (!session) throw new Error("Нисте пријављени")

  const poll = await db.poll.findUnique({ where: { id: pollId } })
  if (!poll || poll.status !== "ACTIVE") {
    throw new Error("Гласање није активно")
  }

  if (poll.endsAt && poll.endsAt < new Date()) {
    throw new Error("Гласање је истекло")
  }

  const existingVote = await db.vote.findUnique({
    where: { pollId_voterId: { pollId, voterId: session.user.id } },
  })

  if (existingVote) {
    throw new Error("Већ сте гласали")
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
    throw new Error("Немате дозволу")
  }

  await db.poll.update({
    where: { id },
    data: { status: "CLOSED" },
  })

  scheduleMirror("POLL", id)

  revalidatePath("/dashboard/glasanje")
  revalidatePath(`/dashboard/glasanje/${id}`)
}

export async function activatePoll(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  await db.poll.update({
    where: { id },
    data: { status: "ACTIVE", startsAt: new Date() },
  })

  scheduleMirror("POLL", id)

  revalidatePath("/dashboard/glasanje")
  revalidatePath(`/dashboard/glasanje/${id}`)
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function exportPollResults(pollId: string) {
  try {
    return await exportPollResultsImpl(pollId)
  } catch (err) {
    const gErr = err as { code?: number; errors?: unknown[] }
    console.error("[exportPollResults] failed", {
      pollId,
      message: err instanceof Error ? err.message : String(err),
      code: gErr?.code,
      errors: gErr?.errors,
      stack: err instanceof Error ? err.stack : undefined,
    })
    throw err
  }
}

async function exportPollResultsImpl(pollId: string) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const archiveRoot = process.env.GDRIVE_ARCHIVE_FOLDER_ID
  if (!archiveRoot) {
    throw new Error("GDRIVE_ARCHIVE_FOLDER_ID није постављен")
  }

  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        include: { _count: { select: { votes: true } } },
      },
    },
  })
  if (!poll) throw new Error("Гласање не постоји")

  const votes = await db.vote.findMany({
    where: { pollId },
    orderBy: { votedAt: "asc" },
    include: {
      voter: { select: { name: true, email: true, unit: true } },
      option: { select: { text: true } },
    },
  })

  const totalVotes = votes.length
  const exportedAt = new Date()
  const tally = await tallyPoll(poll.id, poll.options, poll.requiredShare)
  const summaryRows = poll.options
    .map((o) => {
      const count = o._count.votes
      const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0"
      const share = tally.options.find((t) => t.id === o.id)
      return [
        o.text,
        String(count),
        `${pct}%`,
        tally.weighted ? `${share?.sharePct.toFixed(1) ?? "0.0"}%` : "",
        tally.weighted ? (share?.passes ? "da" : "ne") : "",
      ]
    })
    .map((cols) => cols.map(csvEscape).join(","))

  const detailRows = votes.map((v) =>
    [
      v.voter.name,
      v.voter.unit ?? "",
      v.voter.email,
      v.option.text,
      v.votedAt.toISOString(),
    ]
      .map(csvEscape)
      .join(","),
  )

  const lines = [
    "# Pasterova 16 — Rezultati glasanja",
    `# Naslov: ${poll.title}`,
    `# Status: ${poll.status}`,
    `# Pokrenuto: ${poll.startsAt ? poll.startsAt.toISOString() : ""}`,
    `# Istice: ${poll.endsAt ? poll.endsAt.toISOString() : ""}`,
    `# Eksportovano: ${exportedAt.toISOString()}`,
    `# Ukupno glasova: ${totalVotes}`,
    `# Potrebna vecina: ${poll.requiredShare}% ukupnog udela`,
    `# Kvorum: ${tally.weighted ? `${tally.quorumPct.toFixed(1)}% (${formatArea(tally.votedArea)} od ${formatArea(tally.totalArea)})` : "није рачунат — квадратуре нису унете"}`,
    "",
    "Сумарно",
    "Опција,Гласови,Проценат гласова,Удео у квадратури,Одлука донета",
    ...summaryRows,
    "",
    "Детаљно",
    "Станар,Стан,Емаил,Опција,Време гласања",
    ...detailRows,
  ]

  const csv = "﻿" + lines.join("\n")
  const buffer = Buffer.from(csv, "utf8")

  const year = exportedAt.getFullYear()
  const glasanjaFolderId = await findOrCreateFolder("Glasanja", archiveRoot)
  const yearFolderId = await findOrCreateFolder(String(year), glasanjaFolderId)

  const stamp = exportedAt
    .toISOString()
    .replace(/[:T]/g, "-")
    .replace(/\..+$/, "")
  const fileName = `${sanitizeFileName(poll.title, "glasanje")}_${stamp}.csv`

  const { fileId } = await uploadFile({
    parentFolderId: yearFolderId,
    fileName,
    mimeType: "text/csv",
    buffer,
  })

  return { fileId, fileName }
}
