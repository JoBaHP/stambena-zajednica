"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { readFinanceSheet } from "@/lib/finance-sheet"
import { scheduleMirror } from "@/lib/drive-mirror/schedule"
import { revalidatePath } from "next/cache"

// Uvoz iz tabele "Troskovi stambene zajednice" sa Drive-a.
// Tabela je izvor istine: sta u njoj ne postoji, ne postoji ni u aplikaciji.

/** Preneto stanje se pamti kao jedna stavka, da saldo odgovara tabeli. */
const OPENING_REF = "PRENETO"
const OPENING_CATEGORY = "Пренето стање"

export type ImportSummary = {
  created: number
  updated: number
  removed: number
  problems: { sheet: string; row: number; reason: string }[]
  sheets: number
  income: number
  expense: number
  balance: number
}

export async function importFinanceSheet(): Promise<ImportSummary> {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const { rows, problems, sheets, openingBalance } = await readFinanceSheet()

  // Kategorije iz tabele su slobodan tekst; prave se po potrebi. Tip kategorije
  // se vodi po prvoj stavci u kojoj se pojavila.
  const categoryNames = new Map<string, "INCOME" | "EXPENSE">()
  for (const r of rows) {
    if (r.category && !categoryNames.has(r.category)) {
      categoryNames.set(r.category, r.type)
    }
  }
  if (openingBalance !== null) categoryNames.set(OPENING_CATEGORY, "INCOME")

  const categoryIds = new Map<string, string>()
  for (const [name, type] of categoryNames) {
    const cat = await db.transactionCategory.upsert({
      where: { name },
      update: {},
      create: { name, type },
      select: { id: true },
    })
    categoryIds.set(name, cat.id)
  }

  type Pending = {
    sourceRef: string
    date: Date
    description: string
    type: "INCOME" | "EXPENSE"
    amount: number
    categoryId: string | null
    referenceNum: string | null
    notes: string | null
  }

  const pending: Pending[] = rows.map((r) => ({
    sourceRef: r.sourceRef,
    date: r.date,
    description: r.description,
    type: r.type,
    amount: r.amount,
    categoryId: r.category ? (categoryIds.get(r.category) ?? null) : null,
    referenceNum: r.invoiceRef,
    notes: r.status ? `Статус у табели: ${r.status}` : null,
  }))

  if (openingBalance !== null && rows.length > 0) {
    // Dan pre najranije stavke, da preneto stanje stoji ispred svega.
    const earliest = rows.reduce(
      (min, r) => (r.date < min ? r.date : min),
      rows[0].date,
    )
    const day = new Date(earliest)
    day.setUTCDate(day.getUTCDate() - 1)

    pending.unshift({
      sourceRef: OPENING_REF,
      date: day,
      description: "Стање пренето из претходног периода",
      type: "INCOME",
      amount: openingBalance,
      categoryId: categoryIds.get(OPENING_CATEGORY) ?? null,
      referenceNum: null,
      notes: "Уписано из табеле, није појединачна трансакција",
    })
  }

  let created = 0
  let updated = 0

  for (const p of pending) {
    const existing = await db.transaction.findUnique({
      where: { sourceRef: p.sourceRef },
      select: { id: true },
    })

    const data = {
      type: p.type,
      amount: p.amount,
      description: p.description,
      date: p.date,
      categoryId: p.categoryId,
      referenceNum: p.referenceNum,
      notes: p.notes,
    }

    if (existing) {
      await db.transaction.update({ where: { id: existing.id }, data })
      updated++
      scheduleMirror("TRANSACTION", existing.id)
    } else {
      const row = await db.transaction.create({
        data: { ...data, sourceRef: p.sourceRef, createdById: session.user.id },
        select: { id: true },
      })
      created++
      scheduleMirror("TRANSACTION", row.id)
    }
  }

  // Red obrisan iz tabele mora da nestane i iz aplikacije — inace bi portal
  // prikazivao stavku koje u evidenciji vise nema. Rucno unete stavke (bez
  // sourceRef) se ne diraju.
  const keep = pending.map((p) => p.sourceRef)
  const stale = await db.transaction.findMany({
    where: { sourceRef: { not: null, notIn: keep } },
    select: { id: true },
  })
  for (const s of stale) {
    await db.transaction.delete({ where: { id: s.id } })
    scheduleMirror("TRANSACTION", s.id)
  }

  const income = pending
    .filter((p) => p.type === "INCOME")
    .reduce((sum, p) => sum + p.amount, 0)
  const expense = pending
    .filter((p) => p.type === "EXPENSE")
    .reduce((sum, p) => sum + p.amount, 0)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/finansije")

  return {
    created,
    updated,
    removed: stale.length,
    problems,
    sheets: sheets.length,
    income,
    expense,
    balance: income - expense,
  }
}
