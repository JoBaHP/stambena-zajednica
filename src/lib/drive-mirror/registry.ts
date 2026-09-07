// Sta se ogleda na Drive, gde ide i kako se renderuje.
// Dodavanje novog modula = jedan unos u MIRROR_DEFS + poziv scheduleMirror u akciji.

import { db } from "@/lib/db"
import { formatArea, tallyPoll } from "@/lib/glasanje"
import {
  contactCategoryLabels,
  inspectionResultLabels,
  investmentStatusLabels,
  label,
  pollStatusLabels,
  priorityLabels,
  requestCategoryLabels,
  requestPriorityLabels,
  requestStatusLabels,
  roleLabels,
  taskCategoryLabels,
  taskRecurrenceLabels,
  taskStatusLabels,
  tenderStatusLabels,
  transactionTypeLabels,
} from "@/lib/labels"
import {
  buildDocument,
  field,
  formatDate,
  formatDateTime,
  formatRSD,
  monthNameOf,
  sanitizeFileName,
  section,
  yearOf,
  yesNo,
} from "./format"

export const MIRROR_ENTITIES = [
  "ANNOUNCEMENT",
  "TRANSACTION",
  "REQUEST",
  "TASK",
  "INSPECTION",
  "INVESTMENT",
  "POLL",
  "TENDER",
  "CONTACT",
  "RESIDENT",
] as const

export type MirrorEntity = (typeof MIRROR_ENTITIES)[number]

/** entityId zbirnih registara (kontakti, stanari) — jedan fajl za celu kolekciju. */
export const REGISTRY_ID = "_all"

export type BuiltDocument = {
  folderPath: string[]
  fileName: string
  content: string
  /** Sadrzaj bez promenljivih delova (vreme generisanja) — po njemu ide poredjenje. */
  hashSource?: string
  mimeType?: string
}

export type MirrorTarget = { entityId: string; updatedAt: Date | null }

type MirrorDef = {
  kind: "document" | "registry"
  label: string
  /** Ucitava zapis i renderuje dokument; null ako zapis ne postoji (obrisan). */
  build(entityId: string): Promise<BuiltDocument | null>
  /** Sve mete za backfill/dosinhronizaciju. */
  scan(): Promise<MirrorTarget[]>
}

function docName(title: string, id: string, fallback: string): string {
  // Sufiks id-a znaci da izmena naslova ne pravi novi fajl.
  return `${sanitizeFileName(title, fallback)}_${id.slice(-6)}.txt`
}

function paragraph(text: string | null | undefined): string[] {
  if (!text || !text.trim()) return []
  return text.replace(/\r\n/g, "\n").split("\n")
}

function person(p: { name: string; unit?: string | null; email?: string | null }): string {
  const parts = [p.name]
  if (p.unit) parts.push(`stan ${p.unit}`)
  if (p.email) parts.push(p.email)
  return parts.join(", ")
}

const MIRROR_DEFS: Record<MirrorEntity, MirrorDef> = {
  // ─── OBAVESTENJA ──────────────────────────────────────────────────────────
  ANNOUNCEMENT: {
    kind: "document",
    label: "Obavestenja",
    async scan() {
      const rows = await db.announcement.findMany({
        select: { id: true, updatedAt: true },
      })
      return rows.map((r) => ({ entityId: r.id, updatedAt: r.updatedAt }))
    },
    async build(id) {
      const rec = await db.announcement.findUnique({
        where: { id },
        include: { author: { select: { name: true } } },
      })
      if (!rec) return null

      return {
        folderPath: ["Obavestenja", String(yearOf(rec.publishedAt))],
        fileName: docName(rec.title, rec.id, "obavestenje"),
        ...buildDocument({
          title: "Обавештење",
          entity: "ANNOUNCEMENT",
          entityId: rec.id,
          lines: [
            field("Наслов", rec.title),
            field("Приоритет", label(priorityLabels, rec.priority)),
            field("Закачено", yesNo(rec.isPinned)),
            field("Објављено", formatDateTime(rec.publishedAt)),
            field("Истиче", rec.expiresAt ? formatDate(rec.expiresAt) : "без рока"),
            field("Аутор", rec.author.name),
            ...section("Текст", paragraph(rec.body)),
          ],
        }),
      }
    },
  },

  // ─── FINANSIJE ────────────────────────────────────────────────────────────
  TRANSACTION: {
    kind: "document",
    label: "Finansije",
    async scan() {
      const rows = await db.transaction.findMany({
        select: { id: true, updatedAt: true },
      })
      return rows.map((r) => ({ entityId: r.id, updatedAt: r.updatedAt }))
    },
    async build(id) {
      const rec = await db.transaction.findUnique({
        where: { id },
        include: {
          category: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      })
      if (!rec) return null

      return {
        folderPath: [
          "Finansije",
          String(yearOf(rec.date)),
          monthNameOf(rec.date),
        ],
        fileName: docName(rec.description, rec.id, "transakcija"),
        ...buildDocument({
          title: "Финансијска трансакција",
          entity: "TRANSACTION",
          entityId: rec.id,
          lines: [
            field("Опис", rec.description),
            field("Врста", label(transactionTypeLabels, rec.type)),
            field("Износ", formatRSD(rec.amount)),
            field("Датум", formatDate(rec.date)),
            field("Категорија", rec.category?.name ?? "без категорије"),
            field("Референца", rec.referenceNum),
            field("Евидентирао", rec.createdBy.name),
            field("Креирано", formatDateTime(rec.createdAt)),
            ...section("Напомена", paragraph(rec.notes)),
          ],
        }),
      }
    },
  },

  // ─── ZAHTEVI ZA INTERVENCIJE ──────────────────────────────────────────────
  REQUEST: {
    kind: "document",
    label: "Zahtevi",
    async scan() {
      const rows = await db.maintenanceRequest.findMany({
        select: { id: true, updatedAt: true },
      })
      return rows.map((r) => ({ entityId: r.id, updatedAt: r.updatedAt }))
    },
    async build(id) {
      const rec = await db.maintenanceRequest.findUnique({
        where: { id },
        include: {
          reporter: { select: { name: true, unit: true, email: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true } } },
          },
          photos: { orderBy: { createdAt: "asc" }, select: { name: true } },
        },
      })
      if (!rec) return null

      return {
        folderPath: ["Zahtevi", String(yearOf(rec.createdAt))],
        fileName: docName(rec.title, rec.id, "zahtev"),
        ...buildDocument({
          title: "Захтев за интервенцију",
          entity: "REQUEST",
          entityId: rec.id,
          lines: [
            field("Наслов", rec.title),
            field("Категорија", label(requestCategoryLabels, rec.category)),
            field("Статус", label(requestStatusLabels, rec.status)),
            field("Приоритет", label(requestPriorityLabels, rec.priority)),
            field("Локација", rec.location),
            field("Пријавио", person(rec.reporter)),
            field("Пријављено", formatDateTime(rec.createdAt)),
            field("Решено", rec.resolvedAt ? formatDateTime(rec.resolvedAt) : "—"),
            ...section("Опис", paragraph(rec.description)),
            ...section("Решење", paragraph(rec.resolution)),
            ...section(
              "Fotografije",
              rec.photos.map((p) => p.name),
            ),
            ...section(
              "Komentari",
              rec.comments.map(
                (c) =>
                  `[${formatDateTime(c.createdAt)}] ${c.author.name}: ${c.body}`,
              ),
            ),
          ],
        }),
      }
    },
  },

  // ─── KALENDAR OBAVEZA ─────────────────────────────────────────────────────
  TASK: {
    kind: "document",
    label: "Kalendar",
    async scan() {
      const rows = await db.task.findMany({ select: { id: true, updatedAt: true } })
      return rows.map((r) => ({ entityId: r.id, updatedAt: r.updatedAt }))
    },
    async build(id) {
      const rec = await db.task.findUnique({
        where: { id },
        include: { createdBy: { select: { name: true } } },
      })
      if (!rec) return null

      return {
        folderPath: ["Kalendar", String(yearOf(rec.dueDate))],
        fileName: docName(rec.title, rec.id, "obaveza"),
        ...buildDocument({
          title: "Обавеза из календара",
          entity: "TASK",
          entityId: rec.id,
          lines: [
            field("Наслов", rec.title),
            field("Категорија", label(taskCategoryLabels, rec.category)),
            field("Статус", label(taskStatusLabels, rec.status)),
            field("Рок", formatDate(rec.dueDate)),
            field("Понављање", label(taskRecurrenceLabels, rec.recurrence)),
            field(
              "Zavrseno",
              rec.completedAt ? formatDateTime(rec.completedAt) : "—",
            ),
            field("Креирао", rec.createdBy.name),
            field("Креирано", formatDateTime(rec.createdAt)),
            ...section("Опис", paragraph(rec.description)),
          ],
        }),
      }
    },
  },

  // ─── PP INSPEKCIJE ────────────────────────────────────────────────────────
  INSPECTION: {
    kind: "document",
    label: "Inspekcije",
    async scan() {
      const rows = await db.pPInspection.findMany({
        select: { id: true, updatedAt: true },
      })
      return rows.map((r) => ({ entityId: r.id, updatedAt: r.updatedAt }))
    },
    async build(id) {
      const rec = await db.pPInspection.findUnique({ where: { id } })
      if (!rec) return null

      return {
        folderPath: ["Inspekcije", String(yearOf(rec.inspectionDate))],
        fileName: docName(rec.title, rec.id, "inspekcija"),
        ...buildDocument({
          title: "ПП инспекција",
          entity: "INSPECTION",
          entityId: rec.id,
          lines: [
            field("Наслов", rec.title),
            field("Датум прегледа", formatDate(rec.inspectionDate)),
            field("Резултат", label(inspectionResultLabels, rec.result)),
            field(
              "Sledeci rok",
              rec.nextDueDate ? formatDate(rec.nextDueDate) : "—",
            ),
            field("Контролор", rec.inspector),
            field("Евидентирано", formatDateTime(rec.createdAt)),
            ...section("Напомена", paragraph(rec.notes)),
          ],
        }),
      }
    },
  },

  // ─── INVESTICIJE ──────────────────────────────────────────────────────────
  INVESTMENT: {
    kind: "document",
    label: "Investicije",
    async scan() {
      const rows = await db.investment.findMany({
        select: { id: true, updatedAt: true },
      })
      return rows.map((r) => ({ entityId: r.id, updatedAt: r.updatedAt }))
    },
    async build(id) {
      const rec = await db.investment.findUnique({
        where: { id },
        include: {
          tender: { select: { title: true, status: true, closedAt: true } },
        },
      })
      if (!rec) return null

      const remaining = Number(rec.budget) - Number(rec.spent)

      return {
        folderPath: ["Investicije", String(yearOf(rec.startDate ?? rec.createdAt))],
        fileName: docName(rec.title, rec.id, "investicija"),
        ...buildDocument({
          title: "Инвестиција",
          entity: "INVESTMENT",
          entityId: rec.id,
          lines: [
            field("Наслов", rec.title),
            field("Статус", label(investmentStatusLabels, rec.status)),
            field("Буџет", formatRSD(rec.budget)),
            field("Потрошено", formatRSD(rec.spent)),
            field("Преостало", formatRSD(remaining)),
            field("Почетак", rec.startDate ? formatDate(rec.startDate) : "—"),
            field("Завршетак", rec.endDate ? formatDate(rec.endDate) : "—"),
            field("Креирано", formatDateTime(rec.createdAt)),
            ...section("Опис", paragraph(rec.description)),
            ...section(
              "Tender",
              rec.tender
                ? [
                    field("Наслов", rec.tender.title),
                    field("Статус", label(tenderStatusLabels, rec.tender.status)),
                    field(
                      "Zatvoren",
                      rec.tender.closedAt
                        ? formatDateTime(rec.tender.closedAt)
                        : "—",
                    ),
                  ]
                : [],
            ),
          ],
        }),
      }
    },
  },

  // ─── GLASANJE ─────────────────────────────────────────────────────────────
  POLL: {
    kind: "document",
    label: "Glasanja",
    async scan() {
      const rows = await db.poll.findMany({ select: { id: true, updatedAt: true } })
      return rows.map((r) => ({ entityId: r.id, updatedAt: r.updatedAt }))
    },
    async build(id) {
      const rec = await db.poll.findUnique({
        where: { id },
        include: {
          createdBy: { select: { name: true } },
          options: { include: { _count: { select: { votes: true } } } },
          votes: {
            orderBy: { votedAt: "asc" },
            include: {
              voter: { select: { name: true, unit: true, email: true } },
              option: { select: { text: true } },
            },
          },
        },
      })
      if (!rec) return null

      const total = rec.votes.length
      const tally = await tallyPoll(rec.id, rec.options, rec.requiredShare)

      return {
        folderPath: ["Glasanja", String(yearOf(rec.createdAt))],
        fileName: docName(rec.title, rec.id, "glasanje"),
        ...buildDocument({
          title: "Гласање",
          entity: "POLL",
          entityId: rec.id,
          lines: [
            field("Наслов", rec.title),
            field("Статус", label(pollStatusLabels, rec.status)),
            field("Покренуто", rec.startsAt ? formatDateTime(rec.startsAt) : "—"),
            field("Истиче", rec.endsAt ? formatDateTime(rec.endsAt) : "—"),
            field("Креирао", rec.createdBy.name),
            field("Укупно гласова", total),
            field("Потребна већина", `${rec.requiredShare}% укупног удела`),
            field(
              "Kvorum",
              tally.weighted
                ? `${tally.quorumPct.toFixed(1)}% (${formatArea(tally.votedArea)} od ${formatArea(tally.totalArea)})`
                : "није рачунат — квадратуре нису унете",
            ),
            ...section("Опис", paragraph(rec.description)),
            ...section(
              "Rezultat",
              rec.options.map((o) => {
                const count = o._count.votes
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0"
                const share = tally.options.find((t) => t.id === o.id)
                if (!tally.weighted) return `${o.text}: ${count} (${pct}% гласова)`
                return `${o.text}: ${share?.sharePct.toFixed(1) ?? "0.0"}% удела, ${count} ${count === 1 ? "глас" : "гласова"}${share?.passes ? "  ← одлука донета" : ""}`
              }),
            ),
            ...section(
              "Glasovi",
              rec.votes.map(
                (v) =>
                  `[${formatDateTime(v.votedAt)}] ${person(v.voter)} → ${v.option.text}`,
              ),
            ),
          ],
        }),
      }
    },
  },

  // ─── TENDERI ──────────────────────────────────────────────────────────────
  TENDER: {
    kind: "document",
    label: "Tenderi",
    async scan() {
      // Tender nema updatedAt — dosinhronizacija ga hvata preko contentHash-a.
      const rows = await db.tender.findMany({ select: { id: true, createdAt: true } })
      return rows.map((r) => ({ entityId: r.id, updatedAt: r.createdAt }))
    },
    async build(id) {
      const rec = await db.tender.findUnique({
        where: { id },
        include: {
          investment: { select: { title: true } },
          offers: {
            orderBy: { createdAt: "asc" },
            include: { _count: { select: { votes: true } } },
          },
          votes: {
            include: {
              user: { select: { name: true, unit: true } },
              offer: { select: { company: true } },
            },
          },
        },
      })
      if (!rec) return null

      const winner = rec.offers.find((o) => o.id === rec.selectedId)

      const offerLines = rec.offers.flatMap((o) => [
        `${o.company}${o.id === rec.selectedId ? "  ← изабрана" : ""}`,
        `  Цена:     ${o.price !== null ? formatRSD(o.price) : "nije navedena"}`,
        `  Гласова:  ${o._count.votes}`,
        `  Фајл:     ${o.fileName ?? "—"}`,
        ...(o.description ? [`  Napomena: ${o.description}`] : []),
        ...(o.aiSummary ? [`  Сажетак:  ${o.aiSummary.replace(/\n/g, " ")}`] : []),
        "",
      ])

      return {
        // Isti folder u kom vec zive fajlovi ponuda (tenderi.ts koristi tender.title).
        folderPath: ["Tenderi", rec.title],
        fileName: "_Tender.txt",
        ...buildDocument({
          title: "Тендер",
          entity: "TENDER",
          entityId: rec.id,
          lines: [
            field("Наслов", rec.title),
            field("Инвестиција", rec.investment.title),
            field("Статус", label(tenderStatusLabels, rec.status)),
            field("Број понуда", rec.offers.length),
            field("Изабрана понуда", winner?.company ?? "—"),
            field("Затворен", rec.closedAt ? formatDateTime(rec.closedAt) : "—"),
            field("Креирано", formatDateTime(rec.createdAt)),
            ...section("Опис", paragraph(rec.description)),
            ...section("Понуде", offerLines),
            ...section(
              "Glasovi",
              rec.votes.map(
                (v) => `${person(v.user)} → ${v.offer.company}`,
              ),
            ),
            ...section("АИ поређење", paragraph(rec.aiComparison)),
          ],
        }),
      }
    },
  },

  // ─── KONTAKTI (zbirni registar) ────────────────────────────────────────────
  CONTACT: {
    kind: "registry",
    label: "Kontakti",
    async scan() {
      const latest = await db.contact.aggregate({ _max: { updatedAt: true } })
      return [{ entityId: REGISTRY_ID, updatedAt: latest._max.updatedAt }]
    },
    async build() {
      const rows = await db.contact.findMany({
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      })

      const groups = ["EMERGENCY", "MANAGEMENT", "MAINTENANCE"] as const
      const lines = groups.flatMap((g) =>
        section(
          label(contactCategoryLabels, g),
          rows
            .filter((c) => c.category === g)
            .map((c) => `${c.name} — ${c.phone}${c.note ? ` (${c.note})` : ""}`),
        ),
      )

      return {
        folderPath: ["Kontakti"],
        fileName: "Kontakti.txt",
        ...buildDocument({
          title: "Регистар контаката",
          entity: "CONTACT",
          entityId: REGISTRY_ID,
          lines: [field("Укупно", rows.length), ...lines],
        }),
      }
    },
  },

  // ─── STANARI (zbirni registar) ─────────────────────────────────────────────
  RESIDENT: {
    kind: "registry",
    label: "Stanari",
    async scan() {
      const latest = await db.user.aggregate({ _max: { updatedAt: true } })
      return [{ entityId: REGISTRY_ID, updatedAt: latest._max.updatedAt }]
    },
    async build() {
      const unsorted = await db.user.findMany({
        select: {
          name: true,
          email: true,
          phone: true,
          unit: true,
          role: true,
          area: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
        },
      })

      // Stan je tekst ("12", "PP1"), pa se broj sortira kao broj — inace stan 8
      // ispada posle stana 54.
      const unitKey = (unit: string | null) => {
        if (!unit) return [2, 0, ""] as const
        const n = Number(unit)
        return Number.isFinite(n)
          ? ([0, n, ""] as const)
          : ([1, 0, unit] as const)
      }
      const rows = [...unsorted].sort((a, b) => {
        const ka = unitKey(a.unit)
        const kb = unitKey(b.unit)
        return (
          ka[0] - kb[0] ||
          ka[1] - kb[1] ||
          ka[2].localeCompare(kb[2], "sr-RS") ||
          a.name.localeCompare(b.name, "sr-RS")
        )
      })

      const lines = rows.flatMap((u) => [
        `${u.name}${u.unit ? ` — stan ${u.unit}` : ""}`,
        `  Емаил:     ${u.email}`,
        `  Телефон:   ${u.phone ?? "—"}`,
        `  Квадратура:${u.area ? ` ${formatArea(Number(u.area))}` : " nije uneta"}`,
        `  Улога:     ${label(roleLabels, u.role)}`,
        `  Приступ:   ${u.active ? "активан" : "онемогућен"}`,
        `  Пријава:   ${u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "никад"}`,
        `  Додат:     ${formatDate(u.createdAt)}`,
        "",
      ])

      return {
        folderPath: ["Stanari"],
        fileName: "Stanari.txt",
        ...buildDocument({
          title: "Регистар станара",
          entity: "RESIDENT",
          entityId: REGISTRY_ID,
          lines: [
            field("Укупно", rows.length),
            field("Активних", rows.filter((u) => u.active).length),
            ...section("Списак", lines),
          ],
        }),
      }
    },
  },
}

export function mirrorDef(entity: MirrorEntity): MirrorDef {
  return MIRROR_DEFS[entity]
}
