import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { TransactionForm } from "./transaction-form"

export default async function NovaTransakcijaPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const categories = await db.transactionCategory.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova stavka</h1>
        <p className="text-sm text-muted-foreground mt-1">Evidentiraj prihod ili rashod</p>
      </div>
      <TransactionForm categories={categories} />
    </div>
  )
}
