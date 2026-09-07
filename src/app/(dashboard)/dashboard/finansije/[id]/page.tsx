import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowDownCircle, ArrowUpCircle, Pencil } from "lucide-react"
import { deleteTransaction } from "@/server/actions/finansije"
import { ConfirmDelete } from "@/components/confirm-delete"
import Link from "next/link"

export default async function TransakcijaDetaljPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params

  const transaction = await db.transaction.findUnique({
    where: { id },
    include: { category: true, createdBy: { select: { name: true } } },
  })

  if (!transaction) notFound()

  const deleteWithId = deleteTransaction.bind(null, transaction.id)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {transaction.type === "INCOME" ? (
            <ArrowUpCircle className="w-8 h-8 text-green-500" />
          ) : (
            <ArrowDownCircle className="w-8 h-8 text-red-500" />
          )}
          <div>
            <h1 className="text-2xl font-semibold">{transaction.description}</h1>
            <p className="text-sm text-muted-foreground">
              {transaction.type === "INCOME" ? "Приход" : "Расход"} ·{" "}
              {new Date(transaction.date).toLocaleDateString("sr-RS")}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Детаљи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Износ</span>
            <span
              className={`text-lg font-bold ${
                transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
              }`}
            >
              {transaction.type === "INCOME" ? "+" : "-"}
              {Number(transaction.amount).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} РСД
            </span>
          </div>

          {transaction.category && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Категорија</span>
              <Badge variant="outline">{transaction.category.name}</Badge>
            </div>
          )}

          {transaction.referenceNum && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Број рачуна/налога</span>
              <span className="text-sm">{transaction.referenceNum}</span>
            </div>
          )}

          {transaction.notes && (
            <div>
              <span className="text-sm text-muted-foreground">Напомена</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">{transaction.notes}</p>
            </div>
          )}

          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Унео: {transaction.createdBy.name}</span>
            <span>{new Date(transaction.createdAt).toLocaleString("sr-RS")}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" render={<Link href="/dashboard/finansije" />}>
          Назад
        </Button>
        <Button className="flex-1" render={<Link href={`/dashboard/finansije/${transaction.id}/uredi`} />}>
          <Pencil className="w-4 h-4 mr-2" />
          Измени
        </Button>
        <ConfirmDelete action={deleteWithId} />
      </div>
    </div>
  )
}
