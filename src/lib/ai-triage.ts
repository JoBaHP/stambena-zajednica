import { db } from "@/lib/db"
import { GROQ_MODEL } from "@/lib/groq"
import {
  requestCategoryLabels,
  requestPriorityLabels,
  contactCategoryLabels,
  label,
} from "@/lib/labels"

// Trijaza prijavljenog kvara: iz opisa se predlaze kategorija, hitnost i
// izvodjac iz adresara. Predlog je samo predlog — upravnik odlucuje, zapis se
// ne menja sam od sebe.

export type Triage = {
  category: string | null
  priority: string | null
  contractor: string | null
  reason: string | null
  generatedAt: string
}

const CATEGORIES = Object.keys(requestCategoryLabels)
const PRIORITIES = Object.keys(requestPriorityLabels)

/**
 * Nikad ne baca izuzetak — prijava kvara ne sme da padne zbog AI-ja.
 * Poziva se iz after(), pa stanar ne ceka odgovor modela.
 */
export async function triageRequest(requestId: string): Promise<void> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return

  try {
    const request = await db.maintenanceRequest.findUnique({
      where: { id: requestId },
      select: { title: true, description: true, location: true },
    })
    if (!request) return

    const contacts = await db.contact.findMany({
      where: { category: { in: ["MAINTENANCE", "EMERGENCY"] } },
      select: { name: true, category: true, note: true },
      orderBy: { name: "asc" },
    })

    const contactList = contacts.length
      ? contacts
          .map(
            (c) =>
              `- ${c.name} (${label(contactCategoryLabels, c.category)}${c.note ? `, ${c.note}` : ""})`,
          )
          .join("\n")
      : "(адресар је празан)"

    const Groq = (await import("groq-sdk")).default
    const client = new Groq({ apiKey })

    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      // Reasoning modeli (gpt-oss) troše deo budžeta na razmišljanje; sa 300
      // tokena JSON izađe krnj i Groq vrati 400 "Failed to validate JSON".
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Ти си помоћник управника стамбене заједнице у Србији. Разврставаш пријављене кварове. Одговараш искључиво JSON објектом, без додатног текста. Образложење пишеш на српском језику, ћирилицом, екавицом, највише једна реченица.",
        },
        {
          role: "user",
          content: [
            `Пријава квара:`,
            `Наслов: ${request.title}`,
            `Опис: ${request.description}`,
            `Локација: ${request.location ?? "није наведена"}`,
            ``,
            `Извођачи из адресара:`,
            contactList,
            ``,
            `Врати JSON са пољима:`,
            `"kategorija" — тачно једна од: ${CATEGORIES.join(", ")}`,
            `"prioritet" — тачно једна од: ${PRIORITIES.join(", ")}`,
            `"izvodjac" — тачно име једног извођача из списка изнад, или null ако ниједан не одговара`,
            `"obrazlozenje" — једна реченица зашто`,
          ].join("\n"),
        },
      ],
    })

    const raw = response.choices[0]?.message?.content?.trim()
    if (!raw) return

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const pick = (value: unknown, allowed: string[]) => {
      const s = typeof value === "string" ? value.toUpperCase() : ""
      return allowed.includes(s) ? s : null
    }

    const contractorNames = contacts.map((c) => c.name)
    const contractorRaw =
      typeof parsed.izvodjac === "string" ? parsed.izvodjac.trim() : ""

    const triage: Triage = {
      category: pick(parsed.kategorija, CATEGORIES),
      priority: pick(parsed.prioritet, PRIORITIES),
      // Model ume da izmisli ime — prihvata se samo ono iz adresara.
      contractor: contractorNames.includes(contractorRaw) ? contractorRaw : null,
      reason:
        typeof parsed.obrazlozenje === "string" && parsed.obrazlozenje.trim()
          ? parsed.obrazlozenje.trim().slice(0, 400)
          : null,
      generatedAt: new Date().toISOString(),
    }

    if (!triage.category && !triage.priority && !triage.contractor) return

    await db.maintenanceRequest.update({
      where: { id: requestId },
      data: { aiTriage: triage },
    })
  } catch (err) {
    console.error("[aiTriage] nije uspelo", { requestId, err })
  }
}

/** Bezbedno citanje predloga iz baze (Json kolona je `unknown`). */
export function readTriage(value: unknown): Triage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const t = value as Partial<Triage>
  if (!t.category && !t.priority && !t.contractor) return null
  return {
    category: t.category ?? null,
    priority: t.priority ?? null,
    contractor: t.contractor ?? null,
    reason: t.reason ?? null,
    generatedAt: t.generatedAt ?? "",
  }
}
