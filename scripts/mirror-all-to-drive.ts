import "dotenv/config"

// Jednokratni (ili po potrebi ponovljeni) upis svih postojecih zapisa iz baze u
// citljive dokumente na Google Drive. Automatika u aplikaciji pokriva samo nove
// izmene — ovo prepisuje ono sto je nastalo pre nje.
//
// Pokretanje:
//   cd pasterova-16
//   DATABASE_URL='<url>' npx tsx scripts/mirror-all-to-drive.ts
//
// Opcije (env):
//   MIRROR_FORCE=1        ponovo renderuj sve, cak i ono sto je vec sinhronizovano
//   MIRROR_ENTITIES=...    zapeta-lista entiteta (npr. ANNOUNCEMENT,TRANSACTION)
//   MIRROR_BATCH=25        koliko zapisa po turi

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? ""
  console.log(
    `\n>>> Baza: ${dbUrl.replace(/:[^:@]+@/, ":***@") || "(DATABASE_URL nije postavljen)"}`,
  )

  if (!dbUrl) {
    console.error("DATABASE_URL nije postavljen. Prekidam.")
    process.exit(1)
  }
  if (!process.env.GDRIVE_ARCHIVE_FOLDER_ID) {
    console.error("GDRIVE_ARCHIVE_FOLDER_ID nije postavljen. Prekidam.")
    process.exit(1)
  }

  // Uvoz posle provere env-a — @/lib/db cita DATABASE_URL pri uvozu.
  const { syncPending, MIRROR_ENTITIES } = await import("../src/lib/drive-mirror")
  type Entity = (typeof MIRROR_ENTITIES)[number]

  const force = process.env.MIRROR_FORCE === "1"
  const batch = Number(process.env.MIRROR_BATCH ?? 25)
  const requested = process.env.MIRROR_ENTITIES?.split(",")
    .map((e) => e.trim().toUpperCase())
    .filter(Boolean)

  let entities: readonly Entity[] | undefined
  if (requested?.length) {
    const unknown = requested.filter(
      (e) => !(MIRROR_ENTITIES as readonly string[]).includes(e),
    )
    if (unknown.length) {
      console.error(
        `Nepoznati entiteti: ${unknown.join(", ")}\nDozvoljeni: ${MIRROR_ENTITIES.join(", ")}`,
      )
      process.exit(1)
    }
    entities = requested as Entity[]
  }

  console.log(`>>> Entiteti: ${entities ? entities.join(", ") : "svi"}`)
  console.log(`>>> Tura: ${batch} zapisa, force: ${force ? "da" : "ne"}\n`)

  let totalSynced = 0
  let totalUnchanged = 0
  let totalFailed = 0
  const allErrors: string[] = []

  // Zastita od beskonacne petlje: i najveca baza ove zajednice se obrise u
  // nekoliko tura, pa sve preko ovoga znaci da nesto ne napreduje.
  const MAX_ROUNDS = 200
  let processed = 0

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    // Sa `force` spisak se ne skracuje sam, pa se tura pomera offsetom.
    const result = await syncPending(batch, {
      force,
      entities,
      offset: force ? processed : 0,
    })
    processed += result.synced + result.unchanged + result.failed

    totalSynced += result.synced
    totalUnchanged += result.unchanged
    totalFailed += result.failed
    allErrors.push(...result.errors)

    console.log(
      `Tura ${round}: upisano ${result.synced}, nepromenjeno ${result.unchanged}, greske ${result.failed}, preostalo ${result.remaining}`,
    )

    if (result.remaining === 0) break

    if (result.synced + result.unchanged + result.failed === 0) {
      console.error("Tura nije obradila nista — prekidam da ne bih vrtio u krug.")
      break
    }
    if (round === MAX_ROUNDS) {
      console.error(`Dosegnuto ${MAX_ROUNDS} tura — prekidam. Preostalo: ${result.remaining}`)
    }
  }

  console.log(
    `\n=== Zavrseno: upisano ${totalSynced}, nepromenjeno ${totalUnchanged}, greske ${totalFailed} ===`,
  )

  if (allErrors.length) {
    console.log("\nGreske:")
    for (const e of allErrors) console.log(`  - ${e}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
