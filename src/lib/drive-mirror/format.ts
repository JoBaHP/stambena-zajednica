// Formatiranje citljivih dokumenata koji se ogledaju na Google Drive.
// Vercel radi u UTC, a dokumenti su trajan zapis — zato je zona uvek eksplicitna.

const TIME_ZONE = "Europe/Belgrade"

/**
 * Ime fajla za Drive. Zadrzava slova i cifre bilo kog pisma (obavestenja su na
 * cirilici, pa bi filtriranje na latinicu ostavljalo samo "obavestenje_a1b2c3"),
 * a izbacuje interpunkciju i znakove koje putanje ne trpe.
 */
export function sanitizeFileName(name: string, fallback = "zapis"): string {
  return (
    name
      .normalize("NFC")
      .replace(/[^\p{L}\p{N}\p{M} _-]/gu, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80)
      .replace(/^[-_]+|[-_]+$/g, "") || fallback
  )
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  return d.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  })
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  return d.toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })
}

export function formatRSD(value: unknown): string {
  return `${Number(value ?? 0).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD`
}

export function yesNo(value: boolean): string {
  return value ? "da" : "ne"
}

/** Godina po beogradskoj zoni — odredjuje folder u koji zapis ide. */
export function yearOf(value: Date | string | null | undefined): number {
  const d = value ? (value instanceof Date ? value : new Date(value)) : new Date()
  return Number(
    d.toLocaleString("en-GB", { year: "numeric", timeZone: TIME_ZONE }),
  )
}

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
]

export function monthNameOf(value: Date | string | null | undefined): string {
  const d = value ? (value instanceof Date ? value : new Date(value)) : new Date()
  const month = Number(
    d.toLocaleString("en-GB", { month: "numeric", timeZone: TIME_ZONE }),
  )
  return MONTH_NAMES[month - 1] ?? "Ostalo"
}

/** Poravnati red "Naslov:      vrednost". */
export function field(name: string, value: unknown): string {
  const text =
    value === null || value === undefined || value === "" ? "—" : String(value)
  const key = `${name}:`
  // Duze oznake ne smeju da se sudare sa vrednoscu.
  return `${key.padEnd(Math.max(14, key.length + 1))}${text}`
}

export function section(title: string, lines: string[]): string[] {
  return ["", title, "-".repeat(title.length), ...(lines.length ? lines : ["(nema)"])]
}

/**
 * Zaglavlje + telo + fusnota sa poreklom zapisa.
 *
 * `hashSource` je isti tekst bez vremena generisanja — po njemu se poredi da li
 * se zapis stvarno promenio, da vreme samo po sebi ne bi prepisivalo fajl.
 */
export function buildDocument(opts: {
  title: string
  entity: string
  entityId: string
  lines: string[]
}): { content: string; hashSource: string } {
  const body = [
    `Pasterova 16 — ${opts.title}`,
    "",
    ...opts.lines,
    "",
    "---",
    `Zapis: ${opts.entity} / ${opts.entityId}`,
  ]
  // BOM: bez njega Notepad na Windowsu razbije cirilicu.
  const content =
    "﻿" +
    [
      ...body,
      `Generisano: ${formatDateTime(new Date())} (aplikacija Pasterova 16)`,
    ].join("\n") +
    "\n"

  return { content, hashSource: body.join("\n") }
}
