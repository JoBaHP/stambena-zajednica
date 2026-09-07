import * as XLSX from "xlsx"
import { google } from "googleapis"

// Cita tabelu "Troskovi stambene zajednice" sa Google Drive-a i pretvara je u
// stavke koje aplikacija razume. Tabela ostaje izvor istine — ovo je samo
// citanje, nikad se ne upisuje natrag.
//
// Drive izvozi ceo radni list kao .xlsx, pa se sve kartice dobijaju jednim
// pozivom i bez Sheets API-ja (koji na projektu nije ukljucen).

export type SheetRow = {
  /** "MART/1" — kartica i redni broj dokumenta; po njemu se prepoznaje red. */
  sourceRef: string
  sheet: string
  date: Date
  description: string
  category: string | null
  type: "INCOME" | "EXPENSE"
  amount: number
  /** Prefiks skeniranog racuna, npr. "MAR_1". */
  invoiceRef: string | null
  status: string | null
}

export type ParseResult = {
  rows: SheetRow[]
  /** Redovi koje nije bilo moguce procitati — prikazuju se upravniku. */
  problems: { sheet: string; row: number; reason: string }[]
  sheets: string[]
  /** Stanje preneto iz meseca pre prve kartice, ako ga tabela navodi. */
  openingBalance: number | null
}

const HEADERS = {
  date: /^datum$/i,
  docNo: /redni\s*broj/i,
  category: /^kategorija$/i,
  description: /^opis$/i,
  status: /^status$/i,
  invoice: /skeniran/i,
  expense: /^rashod$/i,
  income: /^prihod$/i,
}

/**
 * Iznos iz tabele: "3,000.00 RSD", "1,032,655.98 din.", "35.00 RSD".
 * Hiljade su zapete a decimale tacka (americki zapis), oznaka valute varira.
 */
function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  const text = String(raw ?? "").trim()
  if (!text) return null
  const cleaned = text
    .replace(/\s/g, "")
    .replace(/(RSD|din\.?|дин\.?|РСД)/gi, "")
    .replace(/,/g, "")
  const num = Number(cleaned)
  return Number.isFinite(num) && num !== 0 ? Math.abs(num) : null
}

/**
 * Datum iz tabele: "01.03.2026." ili Excel serijski broj.
 * Gradi se u UTC — kolona je `@db.Date`, a lokalna ponoc bi se pri upisu
 * pomerila za dan unazad (Beograd je UTC+1/+2).
 */
function parseDate(raw: unknown): Date | null {
  if (raw instanceof Date) {
    return new Date(
      Date.UTC(raw.getFullYear(), raw.getMonth(), raw.getDate()),
    )
  }
  if (typeof raw === "number") {
    // Excel serijski datum: dana od 30.12.1899, 25569 je 01.01.1970.
    if (raw < 1) return null
    return new Date(Math.round((raw - 25569) * 86400 * 1000))
  }
  const m = String(raw ?? "").trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])))
}

function driveClient() {
  const clientId = process.env.GDRIVE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GDRIVE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GDRIVE_OAUTH_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("GDRIVE_OAUTH_* varijable nisu postavljene")
  }
  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })
  return google.drive({ version: "v3", auth })
}

/** Kada je tabela zadnji put menjana — da upravnik zna da li je uvoz zastareo. */
export async function financeSheetModifiedAt(): Promise<Date | null> {
  const fileId = process.env.GDRIVE_FINANCE_SHEET_ID
  if (!fileId) return null
  const res = await driveClient().files.get({
    fileId,
    fields: "modifiedTime",
    supportsAllDrives: true,
  })
  return res.data.modifiedTime ? new Date(res.data.modifiedTime) : null
}

export async function readFinanceSheet(): Promise<ParseResult> {
  const fileId = process.env.GDRIVE_FINANCE_SHEET_ID
  if (!fileId) throw new Error("GDRIVE_FINANCE_SHEET_ID nije postavljen")

  const res = await driveClient().files.export(
    {
      fileId,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { responseType: "arraybuffer" },
  )

  const wb = XLSX.read(Buffer.from(res.data as ArrayBuffer), { type: "buffer" })
  const rows: SheetRow[] = []
  const problems: ParseResult["problems"] = []
  let openingBalance: number | null = null

  for (const sheetName of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
      header: 1,
      blankrows: false,
      defval: "",
      raw: true,
    })

    // Zaglavlje nije na istom redu u svim karticama (u MART-u je red 3, dalje 4),
    // pa se trazi red koji sadrzi "Datum".
    const headerIdx = grid.findIndex((r) =>
      r.some((c) => HEADERS.date.test(String(c).trim())),
    )
    if (headerIdx === -1) {
      problems.push({ sheet: sheetName, row: 0, reason: "nije nađeno zaglavlje" })
      continue
    }

    // "STANJE NA RACUNU iz prethodnog meseca-preneto" stoji iznad zaglavlja.
    // Racuna se samo ono iz prve kartice — dalje su prenosi istog salda.
    if (openingBalance === null) {
      for (let i = 0; i < headerIdx; i++) {
        const text = grid[i].map((c) => String(c)).join(" ")
        if (!/preneto|prethodnog\s*meseca/i.test(text)) continue
        for (const cell of grid[i]) {
          const amount = parseAmount(cell)
          if (amount !== null) {
            openingBalance = amount
            break
          }
        }
        if (openingBalance !== null) break
      }
    }

    const header = grid[headerIdx].map((c) => String(c).trim())
    const col = (re: RegExp) => header.findIndex((h) => re.test(h))
    const cDate = col(HEADERS.date)
    const cDoc = col(HEADERS.docNo)
    const cCat = col(HEADERS.category)
    const cDesc = col(HEADERS.description)
    const cStatus = col(HEADERS.status)
    const cInvoice = col(HEADERS.invoice)
    const cExpense = col(HEADERS.expense)
    const cIncome = col(HEADERS.income)

    if (cExpense === -1 || cIncome === -1) {
      problems.push({
        sheet: sheetName,
        row: headerIdx + 1,
        reason: "nema kolone Rashod ili Prihod",
      })
      continue
    }

    for (let i = headerIdx + 1; i < grid.length; i++) {
      const r = grid[i]
      const rowNo = i + 1
      const date = parseDate(r[cDate])
      const expense = parseAmount(r[cExpense])
      const income = parseAmount(r[cIncome])

      if (!date) {
        // Prazan ili zbirni red se preskace, ali red koji NOSI iznos a nema
        // datum je prava stavka koju bi tiho izgubili — zato se prijavljuje.
        if (expense !== null || income !== null) {
          const what =
            (cDesc >= 0 ? String(r[cDesc] ?? "").trim() : "") ||
            (cCat >= 0 ? String(r[cCat] ?? "").trim() : "") ||
            "stavka"
          const amount = (income ?? expense ?? 0).toLocaleString("sr-RS")
          problems.push({
            sheet: sheetName,
            row: rowNo,
            reason: `nema datum — „${what.slice(0, 40)}" (${amount})`,
          })
        }
        continue
      }

      if (expense === null && income === null) {
        problems.push({ sheet: sheetName, row: rowNo, reason: "nema iznosa" })
        continue
      }
      if (expense !== null && income !== null) {
        problems.push({
          sheet: sheetName,
          row: rowNo,
          reason: "iznos stoji i u Rashodu i u Prihodu",
        })
        continue
      }

      const category = cCat >= 0 ? String(r[cCat] ?? "").trim() : ""
      const description = cDesc >= 0 ? String(r[cDesc] ?? "").trim() : ""
      const docNo = cDoc >= 0 ? String(r[cDoc] ?? "").trim() : ""

      rows.push({
        sourceRef: `${sheetName.trim()}/${docNo || rowNo}`,
        sheet: sheetName.trim(),
        date,
        // Opis je cesto prazan kod uplata — tada kategorija nosi znacenje.
        description: description || category || "Bez opisa",
        category: category || null,
        type: income !== null ? "INCOME" : "EXPENSE",
        amount: income ?? expense ?? 0,
        invoiceRef: cInvoice >= 0 ? String(r[cInvoice] ?? "").trim() || null : null,
        status: cStatus >= 0 ? String(r[cStatus] ?? "").trim() || null : null,
      })
    }
  }

  return { rows, problems, sheets: wb.SheetNames, openingBalance }
}
