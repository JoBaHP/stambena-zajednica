import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
})
const db = new PrismaClient({ adapter })

async function main() {
  console.log("Pokretanje seed-a...")

  const categories = [
    { name: "Servisiranje lifta", type: "EXPENSE" as const, color: "#6366f1" },
    { name: "Servisiranje interfona", type: "EXPENSE" as const, color: "#8b5cf6" },
    { name: "Ciscenje", type: "EXPENSE" as const, color: "#06b6d4" },
    { name: "Popravke i odrzavanje", type: "EXPENSE" as const, color: "#f59e0b" },
    { name: "PP inspekcija", type: "EXPENSE" as const, color: "#ef4444" },
    { name: "Administrativni troskovi", type: "EXPENSE" as const, color: "#64748b" },
    { name: "Investiciona ulaganja", type: "EXPENSE" as const, color: "#a855f7" },
    { name: "Ostali rashodi", type: "EXPENSE" as const, color: "#94a3b8" },
    { name: "Uplata od Informatike", type: "INCOME" as const, color: "#22c55e" },
    { name: "Ostali prihodi", type: "INCOME" as const, color: "#84cc16" },
  ]



  for (const cat of categories) {
    await db.transactionCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }

  console.log(`Kategorije kreirane (${categories.length})`)

  const hashedPassword = await bcrypt.hash("admin123", 12)

  const manager = await db.user.upsert({
    where: { email: "upravnik@pasterova16.rs" },
    update: {},
    create: {
      email: "upravnik@pasterova16.rs",
      name: "Upravnik",
      password: hashedPassword,
      role: "MANAGER",
    },
  })

  console.log(`Upravnik nalog: ${manager.email}`)
  console.log("Lozinka: admin123 (PROMENI NAKON PRVE PRIJAVE)")
  console.log("\nSeed uspesno zavrsen.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
