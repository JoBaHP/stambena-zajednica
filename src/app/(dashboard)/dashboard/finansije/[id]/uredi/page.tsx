import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { TransactionForm } from "../../nova/transaction-form"

export default async function UrediTransakcijuPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params

  const transaction = await db.transaction.findUnique({ where: { id } })
  if (!transaction) notFound()

  const categories = await db.transactionCategory.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Izmeni stavku</h1>
        <p className="text-sm text-muted-foreground mt-1">Azuriraj podatke transakcije</p>
      </div>
      <TransactionForm
        categories={categories}
        defaultValues={{
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount).toString(),
          description: transaction.description,
          date: new Date(transaction.date).toISOString().split("T")[0],
          categoryId: transaction.categoryId ?? "",
          referenceNum: transaction.referenceNum ?? "",
          notes: transaction.notes ?? "",
        }}
      />
    </div>
  )
}
