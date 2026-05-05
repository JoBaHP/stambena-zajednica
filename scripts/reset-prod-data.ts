import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const SUPER_ADMIN_EMAIL = "szpasterova16@gmail.com"

async function main() {
  if (process.env.RESET_CONFIRM !== "yes") {
    console.error(
      "Refusing to run without RESET_CONFIRM=yes. Pokreni:\n  RESET_CONFIRM=yes DATABASE_URL='<prod-url>' npx tsx scripts/reset-prod-data.ts",
    )
    process.exit(1)
  }

  const dbUrl = process.env.DATABASE_URL ?? ""
  console.log(
    `\n>>> Cilj baze: ${dbUrl.replace(/:[^:@]+@/, ":***@") || "(env DATABASE_URL nije postavljen)"}\n`,
  )

  if (!dbUrl) {
    console.error("DATABASE_URL nije postavljen. Prekidam.")
    process.exit(1)
  }

  const adapter = new PrismaPg({ connectionString: dbUrl })
  const prisma = new PrismaClient({ adapter })

  const existing = await prisma.user.findUnique({
    where: { email: SUPER_ADMIN_EMAIL },
  })

  const superAdminPassword =
    process.env.RESET_USER_PASSWORD?.trim() || "SZpasterova16!"
  const hashed = await bcrypt.hash(superAdminPassword, 12)

  if (existing) {
    console.log(
      `Korisnik ${SUPER_ADMIN_EMAIL} postoji — postavicu role=MANAGER, active=true i resetovacu lozinku.`,
    )
  } else {
    console.log(
      `Korisnik ${SUPER_ADMIN_EMAIL} ne postoji — kreiram ga.`,
    )
  }

  console.log("Brisem podatke...")

  await prisma.$transaction(async (tx) => {
    await tx.vote.deleteMany({})
    await tx.pollOption.deleteMany({})
    await tx.poll.deleteMany({})

    await tx.requestComment.deleteMany({})
    await tx.maintenanceRequest.deleteMany({})

    await tx.document.deleteMany({})

    await tx.transaction.deleteMany({})
    await tx.transactionCategory.deleteMany({})

    await tx.pPInspection.deleteMany({})
    await tx.investment.deleteMany({})
    await tx.announcement.deleteMany({})
    await tx.task.deleteMany({})
    await tx.archiveDocument.deleteMany({})
    await tx.contact.deleteMany({})
    await tx.accessRequest.deleteMany({})

    await tx.session.deleteMany({})
    await tx.account.deleteMany({})
    await tx.verificationToken.deleteMany({})

    await tx.user.deleteMany({
      where: { email: { not: SUPER_ADMIN_EMAIL } },
    })

    if (existing) {
      await tx.user.update({
        where: { email: SUPER_ADMIN_EMAIL },
        data: { role: "MANAGER", active: true, password: hashed },
      })
    } else {
      await tx.user.create({
        data: {
          email: SUPER_ADMIN_EMAIL,
          name: "Super Admin",
          password: hashed,
          role: "MANAGER",
          active: true,
        },
      })
    }
  })

  console.log("\nGotovo.")
  console.log(`- ${SUPER_ADMIN_EMAIL} je MANAGER + active`)
  console.log(`- Lozinka: ${superAdminPassword}`)
  console.log("  (prijavi se i promeni preko /dashboard/podesavanja)")
  console.log(
    "\nNapomena: fajlovi u Google Drive nisu obrisani — to uradi rucno ako zelis cistu Drive arhivu.",
  )

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})
