"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { uploadFile, findOrCreateFolder } from "@/lib/drive"
import { scheduleMirror } from "@/lib/drive-mirror/schedule"
import { summarizeOffer } from "@/lib/ai-summary"
import { GROQ_MODEL } from "@/lib/groq"

const MAX_FILE_SIZE = 4 * 1024 * 1024

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "application/xml": ".xml",
  "text/xml": ".xml",
  "text/csv": ".csv",
}

function requireManager(session: { user: { role: string; id: string } } | null): asserts session is { user: { role: string; id: string } } {
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }
}

export async function createTender(investmentId: string, formData: FormData) {
  const session = await auth()
  requireManager(session)

  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  if (!title) throw new Error("Naslov je obavezan")

  const created = await db.tender.create({
    data: { investmentId, title, description },
  })

  scheduleMirror("TENDER", created.id)
  scheduleMirror("INVESTMENT", investmentId)

  revalidatePath(`/dashboard/investicije/${investmentId}`)
  revalidatePath("/dashboard/tenderi")
  redirect(`/dashboard/investicije/${investmentId}`)
}

export async function createTenderOffer(tenderId: string, formData: FormData) {
  const session = await auth()
  requireManager(session)

  const tender = await db.tender.findUnique({ where: { id: tenderId } })
  if (!tender) redirect(`/dashboard/tenderi`)
  if (tender.status === "CLOSED") {
    redirect(`/dashboard/tenderi/${tenderId}/nova-ponuda?error=${encodeURIComponent("Tender je zatvoren")}`)
  }

  const company = (formData.get("company") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const priceRaw = (formData.get("price") as string)?.trim()
  const price = priceRaw ? parseFloat(priceRaw) : null
  const file = formData.get("file") as File | null

  if (!company) {
    redirect(`/dashboard/tenderi/${tenderId}/nova-ponuda?error=${encodeURIComponent("Naziv kompanije je obavezan")}`)
  }

  let fileName: string | null = null
  let fileId: string | null = null
  let mimeType: string | null = null
  let aiSummary: string | null = null

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      redirect(`/dashboard/tenderi/${tenderId}/nova-ponuda?error=${encodeURIComponent("Fajl je prevelik (maks 4MB)")}`)
    }
    if (!ALLOWED_TYPES[file.type]) {
      redirect(`/dashboard/tenderi/${tenderId}/nova-ponuda?error=${encodeURIComponent("Nepodržan format fajla")}`)
    }

    const archiveRoot = process.env.GDRIVE_ARCHIVE_FOLDER_ID
    if (!archiveRoot) {
      redirect(`/dashboard/tenderi/${tenderId}/nova-ponuda?error=${encodeURIComponent("Drive nije konfigurisan")}`)
    }

    try {
      const tendersFolderId = await findOrCreateFolder("Tenderi", archiveRoot)
      const tenderFolderId = await findOrCreateFolder(tender.title, tendersFolderId)
      const buffer = Buffer.from(await file.arrayBuffer())

      const { fileId: uploadedId } = await uploadFile({
        parentFolderId: tenderFolderId,
        fileName: file.name,
        mimeType: file.type,
        buffer,
      })

      fileId = uploadedId
      fileName = file.name
      mimeType = file.type
      aiSummary = await summarizeOffer({ mimeType: file.type, buffer })
    } catch (err) {
      console.error("[createTenderOffer] upload failed", err)
      redirect(`/dashboard/tenderi/${tenderId}/nova-ponuda?error=${encodeURIComponent("Upload nije uspeo. Pokušajte ponovo.")}`)
    }
  }

  await db.tenderOffer.create({
    data: { tenderId, company, description, price, fileName, fileId, mimeType, aiSummary },
  })

  scheduleMirror("TENDER", tenderId)

  revalidatePath(`/dashboard/tenderi/${tenderId}`)
  redirect(`/dashboard/tenderi/${tenderId}`)
}

export async function updateTenderOffer(offerId: string, formData: FormData) {
  const session = await auth()
  requireManager(session)

  const company = (formData.get("company") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const priceRaw = (formData.get("price") as string)?.trim()
  const price = priceRaw ? parseFloat(priceRaw) : null

  if (!company) throw new Error("Naziv kompanije je obavezan")

  const offer = await db.tenderOffer.update({
    where: { id: offerId },
    data: { company, description, price },
  })

  scheduleMirror("TENDER", offer.tenderId)

  revalidatePath(`/dashboard/tenderi/${offer.tenderId}`)
  redirect(`/dashboard/tenderi/${offer.tenderId}`)
}

export async function deleteTenderOffer(offerId: string) {
  const session = await auth()
  requireManager(session)

  const offer = await db.tenderOffer.findUnique({ where: { id: offerId } })
  if (!offer) throw new Error("Ponuda ne postoji")

  if (offer.fileId) {
    try {
      const { deleteFile } = await import("@/lib/drive")
      await deleteFile(offer.fileId)
    } catch (err) {
      console.error("[deleteTenderOffer] drive delete failed", err)
    }
  }

  await db.tenderOffer.delete({ where: { id: offerId } })

  scheduleMirror("TENDER", offer.tenderId)

  revalidatePath(`/dashboard/tenderi/${offer.tenderId}`)
}

export async function castVote(tenderId: string, offerId: string) {
  const session = await auth()
  if (!session) throw new Error("Niste prijavljeni")

  const tender = await db.tender.findUnique({ where: { id: tenderId } })
  if (!tender || tender.status !== "OPEN") throw new Error("Glasanje nije aktivno")

  const userId = session.user.id

  const existing = await db.tenderVote.findUnique({
    where: { tenderId_userId: { tenderId, userId } },
  })

  if (existing?.offerId === offerId) {
    await db.tenderVote.delete({ where: { tenderId_userId: { tenderId, userId } } })
  } else {
    await db.tenderVote.upsert({
      where: { tenderId_userId: { tenderId, userId } },
      update: { offerId },
      create: { tenderId, offerId, userId },
    })
  }

  revalidatePath(`/dashboard/tenderi/${tenderId}`)
}

export async function closeTender(tenderId: string, winnerId: string) {
  const session = await auth()
  requireManager(session)

  await db.tender.update({
    where: { id: tenderId },
    data: { status: "CLOSED", selectedId: winnerId, closedAt: new Date() },
  })

  scheduleMirror("TENDER", tenderId)

  revalidatePath(`/dashboard/tenderi/${tenderId}`)
  revalidatePath("/dashboard/tenderi")
  redirect(`/dashboard/tenderi/${tenderId}`)
}

export async function compareOffers(tenderId: string) {
  const session = await auth()
  requireManager(session)

  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY није постављен")

  const tender = await db.tender.findUnique({
    where: { id: tenderId },
    include: { offers: { orderBy: { createdAt: "asc" } } },
  })
  if (!tender) throw new Error("Тендер не постоји")
  if (tender.offers.length < 2) throw new Error("Потребне су најмање две понуде за поређење")

  const offerList = tender.offers
    .map((o, i) => {
      const price = o.price ? `${Number(o.price).toLocaleString("sr-RS")} РСД` : "цена није наведена"
      const summary = o.aiSummary ? `Сажетак: ${o.aiSummary}` : ""
      const desc = o.description ? `Напомена: ${o.description}` : ""
      return `${i + 1}. ${o.company} — ${price}\n${desc}\n${summary}`.trim()
    })
    .join("\n\n")

  const Groq = (await import("groq-sdk")).default
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    // Rezerva za reasoning modele: oni deo budzeta trose na razmisljanje pre
    // odgovora, pa pretesan limit vrati prazan tekst umesto greske. Duzinu
    // odgovora ogranicava prompt, ne ovaj broj.
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content:
          "Ти си помоћник стамбене заједнице у Србији. Приказујеш информације о понудама у облику прегледне табеле. Пишеш искључиво ћириличним писмом, екавицом, на српском језику. Не рангираш понуде нити препоручујеш избор.",
      },
      {
        role: "user",
        content: `Направи табелу поређења следећих понуда за тендер „${tender.title}". Табела треба да садржи колоне: Компанија, Цена, и кључне информације из доступних података. Користи Markdown формат табеле. Не давај препоруке нити рангирај понуде.\n\n${offerList}`,
      },
    ],
  })

  const aiComparison = response.choices[0]?.message?.content?.trim() ?? null
  if (!aiComparison) throw new Error("АИ није успео да генерише поређење")

  await db.tender.update({ where: { id: tenderId }, data: { aiComparison } })

  scheduleMirror("TENDER", tenderId)

  revalidatePath(`/dashboard/tenderi/${tenderId}`)
}

export async function regenerateSummary(offerId: string) {
  const session = await auth()
  requireManager(session)

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY nije postavljen u Vercel env vars")
  }

  const offer = await db.tenderOffer.findUnique({ where: { id: offerId } })
  if (!offer?.fileId || !offer.mimeType) throw new Error("Ponuda nema fajl")

  const { downloadFile } = await import("@/lib/drive")
  const { buffer } = await downloadFile(offer.fileId)
  const aiSummary = await summarizeOffer({ mimeType: offer.mimeType, buffer })

  if (!aiSummary) throw new Error("AI nije uspeo da generiše sažetak. Proverite format fajla.")

  await db.tenderOffer.update({ where: { id: offerId }, data: { aiSummary } })

  scheduleMirror("TENDER", offer.tenderId)

  revalidatePath(`/dashboard/tenderi/${offer.tenderId}`)
}

export async function reopenTender(tenderId: string) {
  const session = await auth()
  requireManager(session)

  await db.tender.update({
    where: { id: tenderId },
    data: { status: "OPEN", selectedId: null, closedAt: null },
  })

  scheduleMirror("TENDER", tenderId)

  revalidatePath(`/dashboard/tenderi/${tenderId}`)
  revalidatePath("/dashboard/tenderi")
  redirect(`/dashboard/tenderi/${tenderId}`)
}
