import "dotenv/config"

// Vraca podatke sa Google Drive-a u bazu iz JSON snimaka u folderu `_Podaci/`.
// Citljivi .txt dokumenti se NE citaju — oni su za ljude; JSON je za aplikaciju.
//
// Pokretanje (prvo bez upisa, samo prikaz):
//   cd pasterova-16
//   DATABASE_URL='<url>' npx tsx scripts/restore-from-drive.ts
//
// Stvarni upis:
//   RESTORE_CONFIRM=yes DATABASE_URL='<url>' npx tsx scripts/restore-from-drive.ts
//
// Upis je upsert po id-u: postojeci zapisi se azuriraju, nedostajuci prave.
// Nista se ne brise. Redosled poštuje strane kljuceve.

const RESTORE_ORDER = [
  "RESIDENT",
  "CONTACT",
  "TRANSACTION",
  "ANNOUNCEMENT",
  "TASK",
  "INSPECTION",
  "INVESTMENT",
  "TENDER",
  "POLL",
  "REQUEST",
  "ARCHIVE",
] as const

type Snapshot = Record<string, unknown> & { records?: unknown[] }

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function date(value: unknown): Date | null {
  return value ? new Date(String(value)) : null
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? ""
  const dryRun = process.env.RESTORE_CONFIRM !== "yes"

  console.log(
    `\n>>> Baza: ${dbUrl.replace(/:[^:@]+@/, ":***@") || "(DATABASE_URL nije postavljen)"}`,
  )
  console.log(
    dryRun
      ? ">>> PROBNI PROLAZ — nista se ne upisuje. Za stvarni upis dodaj RESTORE_CONFIRM=yes\n"
      : ">>> STVARNI UPIS u bazu (upsert po id-u, nista se ne brise)\n",
  )

  if (!dbUrl) {
    console.error("DATABASE_URL nije postavljen. Prekidam.")
    process.exit(1)
  }
  const archiveRoot = process.env.GDRIVE_ARCHIVE_FOLDER_ID
  if (!archiveRoot) {
    console.error("GDRIVE_ARCHIVE_FOLDER_ID nije postavljen. Prekidam.")
    process.exit(1)
  }

  const { db } = await import("../src/lib/db")
  const { findOrCreateFolder, findFileInFolder, downloadFile } = await import(
    "../src/lib/drive"
  )
  const { DATA_FOLDER, dataDump } = await import("../src/lib/drive-mirror/data")

  const dataFolderId = await findOrCreateFolder(DATA_FOLDER, archiveRoot)

  // Placeholder lozinka: hes lozinke se ne izvozi na Drive, pa vraceni korisnici
  // dobijaju nasumicnu lozinku koju upravnik resetuje preko /dashboard/stanari.
  const bcrypt = (await import("bcryptjs")).default
  const placeholderPassword = await bcrypt.hash(
    `restore-${Math.random().toString(36).slice(2)}${Date.now()}`,
    12,
  )

  let created = 0
  let updated = 0

  async function upsert(
    model: string,
    rows: Record<string, unknown>[],
    build: (row: Record<string, unknown>) => Record<string, unknown>,
    extraOnCreate: (row: Record<string, unknown>) => Record<string, unknown> = () => ({}),
  ) {
    if (!rows.length) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (db as any)[model]

    for (const row of rows) {
      const id = String(row.id)
      const data = build(row)

      if (dryRun) {
        const exists = await delegate.findUnique({ where: { id }, select: { id: true } })
        if (exists) updated++
        else created++
        continue
      }

      await delegate.upsert({
        where: { id },
        update: data,
        create: { id, ...data, ...extraOnCreate(row) },
      })
      updated++
    }
    console.log(`  ${model}: ${rows.length} zapisa`)
  }

  for (const entity of RESTORE_ORDER) {
    const fileName = dataDump(entity).fileName
    const fileId = await findFileInFolder(fileName, dataFolderId)
    if (!fileId) {
      console.log(`${entity}: ${fileName} ne postoji na Drive-u — preskacem`)
      continue
    }

    const { buffer } = await downloadFile(fileId)
    const snap = JSON.parse(buffer.toString("utf8")) as Snapshot
    const records = asRows(snap.records)
    console.log(`${entity}: ${fileName} — ${records.length} zapisa`)

    switch (entity) {
      case "RESIDENT":
        await upsert(
          "user",
          records,
          (r) => ({
            email: String(r.email),
            name: String(r.name),
            role: r.role,
            phone: r.phone ?? null,
            unit: r.unit ?? null,
            notifyEmail: Boolean(r.notifyEmail),
            notifySms: Boolean(r.notifySms),
            active: Boolean(r.active),
            lastLoginAt: date(r.lastLoginAt),
          }),
          () => ({ password: placeholderPassword }),
        )
        break

      case "CONTACT":
        await upsert("contact", records, (r) => ({
          name: String(r.name),
          phone: String(r.phone),
          category: r.category,
          note: r.note ?? null,
          sortOrder: Number(r.sortOrder ?? 0),
        }))
        break

      case "TRANSACTION":
        await upsert("transactionCategory", asRows(snap.categories), (r) => ({
          name: String(r.name),
          type: r.type,
          color: String(r.color ?? "#6366f1"),
        }))
        await upsert("transaction", records, (r) => ({
          type: r.type,
          amount: String(r.amount),
          description: String(r.description),
          date: date(r.date)!,
          categoryId: r.categoryId ?? null,
          referenceNum: r.referenceNum ?? null,
          notes: r.notes ?? null,
          createdById: String(r.createdById),
        }))
        break

      case "ANNOUNCEMENT":
        await upsert("announcement", records, (r) => ({
          title: String(r.title),
          body: String(r.body),
          priority: r.priority,
          isPinned: Boolean(r.isPinned),
          publishedAt: date(r.publishedAt)!,
          expiresAt: date(r.expiresAt),
          authorId: String(r.authorId),
        }))
        break

      case "TASK":
        await upsert("task", records, (r) => ({
          title: String(r.title),
          description: r.description ?? null,
          dueDate: date(r.dueDate)!,
          category: r.category,
          status: r.status,
          recurrence: r.recurrence,
          completedAt: date(r.completedAt),
          createdById: String(r.createdById),
        }))
        break

      case "INSPECTION":
        await upsert("pPInspection", records, (r) => ({
          title: String(r.title),
          inspectionDate: date(r.inspectionDate)!,
          nextDueDate: date(r.nextDueDate),
          result: r.result,
          inspector: r.inspector ?? null,
          notes: r.notes ?? null,
        }))
        break

      case "INVESTMENT":
        await upsert("investment", records, (r) => ({
          title: String(r.title),
          description: r.description ?? null,
          budget: String(r.budget),
          spent: String(r.spent ?? 0),
          status: r.status,
          startDate: date(r.startDate),
          endDate: date(r.endDate),
        }))
        break

      case "TENDER":
        await upsert("tender", records, (r) => ({
          investmentId: String(r.investmentId),
          title: String(r.title),
          description: r.description ?? null,
          status: r.status,
          selectedId: r.selectedId ?? null,
          aiComparison: r.aiComparison ?? null,
          closedAt: date(r.closedAt),
        }))
        await upsert("tenderOffer", asRows(snap.offers), (r) => ({
          tenderId: String(r.tenderId),
          company: String(r.company),
          description: r.description ?? null,
          price: r.price !== null && r.price !== undefined ? String(r.price) : null,
          fileName: r.fileName ?? null,
          fileId: r.fileId ?? null,
          mimeType: r.mimeType ?? null,
          aiSummary: r.aiSummary ?? null,
        }))
        await upsert("tenderVote", asRows(snap.votes), (r) => ({
          tenderId: String(r.tenderId),
          offerId: String(r.offerId),
          userId: String(r.userId),
        }))
        break

      case "POLL":
        await upsert("poll", records, (r) => ({
          title: String(r.title),
          description: r.description ?? null,
          status: r.status,
          startsAt: date(r.startsAt),
          endsAt: date(r.endsAt),
          createdById: String(r.createdById),
        }))
        await upsert("pollOption", asRows(snap.options), (r) => ({
          pollId: String(r.pollId),
          text: String(r.text),
        }))
        await upsert("vote", asRows(snap.votes), (r) => ({
          pollId: String(r.pollId),
          optionId: String(r.optionId),
          voterId: String(r.voterId),
          votedAt: date(r.votedAt)!,
        }))
        break

      case "REQUEST":
        await upsert("maintenanceRequest", records, (r) => ({
          title: String(r.title),
          description: String(r.description),
          category: r.category,
          status: r.status,
          priority: r.priority,
          location: r.location ?? null,
          resolution: r.resolution ?? null,
          resolvedAt: date(r.resolvedAt),
          reporterId: String(r.reporterId),
        }))
        await upsert("requestComment", asRows(snap.comments), (r) => ({
          requestId: String(r.requestId),
          authorId: String(r.authorId),
          body: String(r.body),
        }))
        break

      case "ARCHIVE":
        await upsert("archiveDocument", records, (r) => ({
          title: String(r.title),
          description: r.description ?? null,
          category: r.category,
          year: Number(r.year),
          fileName: String(r.fileName),
          fileId: String(r.fileId),
          fileSize: Number(r.fileSize),
          mimeType: String(r.mimeType),
          uploadedById: String(r.uploadedById),
        }))
        break
    }
  }

  if (dryRun) {
    console.log(
      `\n=== Probni prolaz: ${created} novih, ${updated} postojecih zapisa ===`,
    )
    console.log("Za stvarni upis: RESTORE_CONFIRM=yes")
  } else {
    console.log(`\n=== Zavrseno: ${updated} zapisa upisano (upsert) ===`)
    console.log(
      "Vraceni korisnici koji ranije nisu postojali imaju nasumicnu lozinku —\n" +
        "resetuj je preko /dashboard/stanari/<id>.",
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
