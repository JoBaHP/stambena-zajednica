// Sta se ogleda na Drive, gde ide i kako se renderuje.
// Dodavanje novog modula = jedan unos u MIRROR_DEFS + poziv scheduleMirror u akciji.

import { db } from "@/lib/db"
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
          title: "Obavestenje",
          entity: "ANNOUNCEMENT",
          entityId: rec.id,
          lines: [
            field("Naslov", rec.title),
            field("Prioritet", label(priorityLabels, rec.priority)),
            field("Zakaceno", yesNo(rec.isPinned)),
            field("Objavljeno", formatDateTime(rec.publishedAt)),
            field("Istice", rec.expiresAt ? formatDate(rec.expiresAt) : "bez roka"),
            field("Autor", rec.author.name),
            ...section("Tekst", paragraph(rec.body)),
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
          title: "Finansijska transakcija",
          entity: "TRANSACTION",
          entityId: rec.id,
          lines: [
            field("Opis", rec.description),
            field("Vrsta", label(transactionTypeLabels, rec.type)),
            field("Iznos", formatRSD(rec.amount)),
            field("Datum", formatDate(rec.date)),
            field("Kategorija", rec.category?.name ?? "bez kategorije"),
            field("Referenca", rec.referenceNum),
            field("Evidentirao", rec.createdBy.name),
            field("Kreirano", formatDateTime(rec.createdAt)),
            ...section("Napomena", paragraph(rec.notes)),
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
        },
      })
      if (!rec) return null

      return {
        folderPath: ["Zahtevi", String(yearOf(rec.createdAt))],
        fileName: docName(rec.title, rec.id, "zahtev"),
        ...buildDocument({
          title: "Zahtev za intervenciju",
          entity: "REQUEST",
          entityId: rec.id,
          lines: [
            field("Naslov", rec.title),
            field("Kategorija", label(requestCategoryLabels, rec.category)),
            field("Status", label(requestStatusLabels, rec.status)),
            field("Prioritet", label(requestPriorityLabels, rec.priority)),
            field("Lokacija", rec.location),
            field("Prijavio", person(rec.reporter)),
            field("Prijavljeno", formatDateTime(rec.createdAt)),
            field("Reseno", rec.resolvedAt ? formatDateTime(rec.resolvedAt) : "—"),
            ...section("Opis", paragraph(rec.description)),
            ...section("Resenje", paragraph(rec.resolution)),
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
          title: "Obaveza iz kalendara",
          entity: "TASK",
          entityId: rec.id,
          lines: [
            field("Naslov", rec.title),
            field("Kategorija", label(taskCategoryLabels, rec.category)),
            field("Status", label(taskStatusLabels, rec.status)),
            field("Rok", formatDate(rec.dueDate)),
            field("Ponavljanje", label(taskRecurrenceLabels, rec.recurrence)),
            field(
              "Zavrseno",
              rec.completedAt ? formatDateTime(rec.completedAt) : "—",
            ),
            field("Kreirao", rec.createdBy.name),
            field("Kreirano", formatDateTime(rec.createdAt)),
            ...section("Opis", paragraph(rec.description)),
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
          title: "PP inspekcija",
          entity: "INSPECTION",
          entityId: rec.id,
          lines: [
            field("Naslov", rec.title),
            field("Datum pregleda", formatDate(rec.inspectionDate)),
            field("Rezultat", label(inspectionResultLabels, rec.result)),
            field(
              "Sledeci rok",
              rec.nextDueDate ? formatDate(rec.nextDueDate) : "—",
            ),
            field("Kontrolor", rec.inspector),
            field("Evidentirano", formatDateTime(rec.createdAt)),
            ...section("Napomena", paragraph(rec.notes)),
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
          title: "Investicija",
          entity: "INVESTMENT",
          entityId: rec.id,
          lines: [
            field("Naslov", rec.title),
            field("Status", label(investmentStatusLabels, rec.status)),
            field("Budzet", formatRSD(rec.budget)),
            field("Potroseno", formatRSD(rec.spent)),
            field("Preostalo", formatRSD(remaining)),
            field("Pocetak", rec.startDate ? formatDate(rec.startDate) : "—"),
            field("Zavrsetak", rec.endDate ? formatDate(rec.endDate) : "—"),
            field("Kreirano", formatDateTime(rec.createdAt)),
            ...section("Opis", paragraph(rec.description)),
            ...section(
              "Tender",
              rec.tender
                ? [
                    field("Naslov", rec.tender.title),
                    field("Status", label(tenderStatusLabels, rec.tender.status)),
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

      return {
        folderPath: ["Glasanja", String(yearOf(rec.createdAt))],
        fileName: docName(rec.title, rec.id, "glasanje"),
        ...buildDocument({
          title: "Glasanje",
          entity: "POLL",
          entityId: rec.id,
          lines: [
            field("Naslov", rec.title),
            field("Status", label(pollStatusLabels, rec.status)),
            field("Pokrenuto", rec.startsAt ? formatDateTime(rec.startsAt) : "—"),
            field("Istice", rec.endsAt ? formatDateTime(rec.endsAt) : "—"),
            field("Kreirao", rec.createdBy.name),
            field("Ukupno glasova", total),
            ...section("Opis", paragraph(rec.description)),
            ...section(
              "Rezultat",
              rec.options.map((o) => {
                const count = o._count.votes
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0"
                return `${o.text}: ${count} (${pct}%)`
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
        `${o.company}${o.id === rec.selectedId ? "  ← izabrana" : ""}`,
        `  Cena:     ${o.price !== null ? formatRSD(o.price) : "nije navedena"}`,
        `  Glasova:  ${o._count.votes}`,
        `  Fajl:     ${o.fileName ?? "—"}`,
        ...(o.description ? [`  Napomena: ${o.description}`] : []),
        ...(o.aiSummary ? [`  Sazetak:  ${o.aiSummary.replace(/\n/g, " ")}`] : []),
        "",
      ])

      return {
        // Isti folder u kom vec zive fajlovi ponuda (tenderi.ts koristi tender.title).
        folderPath: ["Tenderi", rec.title],
        fileName: "_Tender.txt",
        ...buildDocument({
          title: "Tender",
          entity: "TENDER",
          entityId: rec.id,
          lines: [
            field("Naslov", rec.title),
            field("Investicija", rec.investment.title),
            field("Status", label(tenderStatusLabels, rec.status)),
            field("Broj ponuda", rec.offers.length),
            field("Izabrana ponuda", winner?.company ?? "—"),
            field("Zatvoren", rec.closedAt ? formatDateTime(rec.closedAt) : "—"),
            field("Kreirano", formatDateTime(rec.createdAt)),
            ...section("Opis", paragraph(rec.description)),
            ...section("Ponude", offerLines),
            ...section(
              "Glasovi",
              rec.votes.map(
                (v) => `${person(v.user)} → ${v.offer.company}`,
              ),
            ),
            ...section("AI poredjenje", paragraph(rec.aiComparison)),
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
          title: "Registar kontakata",
          entity: "CONTACT",
          entityId: REGISTRY_ID,
          lines: [field("Ukupno", rows.length), ...lines],
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
        `  Email:     ${u.email}`,
        `  Telefon:   ${u.phone ?? "—"}`,
        `  Uloga:     ${label(roleLabels, u.role)}`,
        `  Pristup:   ${u.active ? "aktivan" : "onemogucen"}`,
        `  Prijava:   ${u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "nikad"}`,
        `  Dodat:     ${formatDate(u.createdAt)}`,
        "",
      ])

      return {
        folderPath: ["Stanari"],
        fileName: "Stanari.txt",
        ...buildDocument({
          title: "Registar stanara",
          entity: "RESIDENT",
          entityId: REGISTRY_ID,
          lines: [
            field("Ukupno", rows.length),
            field("Aktivnih", rows.filter((u) => u.active).length),
            ...section("Spisak", lines),
          ],
        }),
      }
    },
  },
}

export function mirrorDef(entity: MirrorEntity): MirrorDef {
  return MIRROR_DEFS[entity]
}
