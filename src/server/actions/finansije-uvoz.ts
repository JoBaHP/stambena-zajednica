"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { readFinanceSheet } from "@/lib/finance-sheet"
import { scheduleDataMirror } from "@/lib/drive-mirror/schedule"
import { revalidatePath } from "next/cache"

// Uvoz iz tabele "Troskovi stambene zajednice" sa Drive-a.
// Tabela je izvor istine: sta u njoj ne postoji, ne postoji ni u aplikaciji.

/** Preneto stanje se pamti kao jedna stavka, da saldo odgovara tabeli. */
const OPENING_REF = "PRENETO"
const OPENING_CATEGORY = "Пренето стање"

export type ImportSummary = {
  created: number
  updated: number
  unchanged: number
  removed: number
  problems: { sheet: string; row: number; reason: string }[]
  sheets: number
  income: number
  expense: number
}

/**
 * Rezultat se VRACA, ne baca.
 *
 * Next u produkciji zamenjuje tekst svake neuhvacene greske generickom
 * porukom sa digest-om, pa bi upravnik dobio "An error occurred in the Server
 * Components render" umesto pravog uzroka. Vraceni string prolazi netaknut.
 */
export type ImportResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string }

export async function importFinanceSheet(): Promise<ImportResult> {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    return { ok: false, error: "Немате дозволу" }
  }
  if (!process.env.GDRIVE_FINANCE_SHEET_ID) {
    return {
      ok: false,
      error:
        "GDRIVE_FINANCE_SHEET_ID није постављен. Додај id табеле у env варијабле на Vercelu.",
    }
  }

  try {
    return { ok: true, summary: await runImport(session.user.id) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[uvozFinansija] nije uspelo", {
      message,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return { ok: false, error: `Читање табеле није успело: ${message}` }
  }
}

async function runImport(userId: string): Promise<ImportSummary> {
  const { rows, problems, sheets, openingBalance } = await readFinanceSheet()

  // Kategorije iz tabele su slobodan tekst; prave se po potrebi.
  const wanted = new Map<string, "INCOME" | "EXPENSE">()
  for (const r of rows) {
    if (r.category && !wanted.has(r.category)) wanted.set(r.category, r.type)
  }
  if (openingBalance !== null) wanted.set(OPENING_CATEGORY, "INCOME")

  const existingCats = await db.transactionCategory.findMany({
    where: { name: { in: [...wanted.keys()] } },
    select: { id: true, name: true },
  })
  const categoryIds = new Map(existingCats.map((c) => [c.name, c.id]))

  const missingCats = [...wanted.entries()].filter(([name]) => !categoryIds.has(name))
  if (missingCats.length > 0) {
    await db.transactionCategory.createMany({
      data: missingCats.map(([name, type]) => ({ name, type })),
      skipDuplicates: true,
    })
    const refreshed = await db.transactionCategory.findMany({
      where: { name: { in: missingCats.map(([name]) => name) } },
      select: { id: true, name: true },
    })
    for (const c of refreshed) categoryIds.set(c.name, c.id)
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
    const earliest = rows.reduce((min, r) => (r.date < min ? r.date : min), rows[0].date)
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

  // Jedan upit za sve postojece redove umesto findUnique po stavci — inace je
  // ovo 45 uzastopnih odlazaka do baze i funkcija pregori timeout.
  const refs = pending.map((p) => p.sourceRef)
  const existing = await db.transaction.findMany({
    where: { sourceRef: { in: refs } },
    select: {
      id: true,
      sourceRef: true,
      type: true,
      amount: true,
      description: true,
      date: true,
      categoryId: true,
      referenceNum: true,
      notes: true,
    },
  })
  const byRef = new Map(existing.map((e) => [e.sourceRef, e]))

  const toCreate: Pending[] = []
  const toUpdate: { id: string; data: Omit<Pending, "sourceRef"> }[] = []
  let unchanged = 0

  for (const p of pending) {
    const found = byRef.get(p.sourceRef)
    if (!found) {
      toCreate.push(p)
      continue
    }
    // Upisuje se samo ono sto se stvarno promenilo.
    const same =
      found.type === p.type &&
      Number(found.amount) === p.amount &&
      found.description === p.description &&
      found.date.getTime() === p.date.getTime() &&
      found.categoryId === p.categoryId &&
      (found.referenceNum ?? null) === p.referenceNum &&
      (found.notes ?? null) === p.notes
    if (same) {
      unchanged++
      continue
    }
    // Polja se navode izricito — `sourceRef` nikad ne sme u `update`, a ovako
    // to ne zavisi od destructuring trika.
    toUpdate.push({
      id: found.id,
      data: {
        type: p.type,
        amount: p.amount,
        description: p.description,
        date: p.date,
        categoryId: p.categoryId,
        referenceNum: p.referenceNum,
        notes: p.notes,
      },
    })
  }

  if (toCreate.length > 0) {
    await db.transaction.createMany({
      data: toCreate.map((p) => ({ ...p, createdById: userId })),
      skipDuplicates: true,
    })
  }
  for (const u of toUpdate) {
    await db.transaction.update({ where: { id: u.id }, data: u.data })
  }

  // Red obrisan iz tabele mora da nestane i iz aplikacije. Rucno unete stavke
  // (bez sourceRef) se ne diraju.
  const removed = await db.transaction.deleteMany({
    where: { sourceRef: { not: null, notIn: refs } },
  })

  // Citljivi .txt dokumenti se NE upisuju odavde — to je 45 upisa na Drive i
  // funkcija ne bi stigla. Ovde ide samo JSON snimak modula (jedan fajl);
  // dokumente po stavci pokupi "Синхронизуј сада" u podesavanjima, koje radi
  // u turama, ili scripts/mirror-all-to-drive.ts.
  scheduleDataMirror("TRANSACTION")

  const income = pending
    .filter((p) => p.type === "INCOME" && p.sourceRef !== OPENING_REF)
    .reduce((sum, p) => sum + p.amount, 0)
  const expense = pending
    .filter((p) => p.type === "EXPENSE")
    .reduce((sum, p) => sum + p.amount, 0)

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/finansije")

  return {
    created: toCreate.length,
    updated: toUpdate.length,
    unchanged,
    removed: removed.count,
    problems,
    sheets: sheets.length,
    income,
    expense,
  }
}
