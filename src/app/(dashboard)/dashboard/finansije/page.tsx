import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function FinansijePage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const transactions = await db.transaction.findMany({
    orderBy: { date: "desc" },
    include: { category: true },
    take: 50,
  })

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Finansije</h1>
          <p className="text-sm text-muted-foreground mt-1">Evidencija prihoda i rashoda zajednickog racuna</p>
        </div>
        <Button render={<Link href="/dashboard/finansije/nova" />}>
          <Plus className="w-4 h-4 mr-2" />
          Nova stavka
        </Button>
      </div>

      {/* Sumarni kartici */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ukupni prihodi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              +{totalIncome.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ukupni rashodi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              -{totalExpense.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stanje racuna</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {balance.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista transakcija */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sve transakcije</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nema evidentiranih transakcija</p>
              <Button
                className="mt-4"
                variant="outline"
                render={<Link href="/dashboard/finansije/nova" />}
              >
                Dodaj prvu stavku
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/finansije/${t.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {t.type === "INCOME" ? (
                      <ArrowUpCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{t.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.date).toLocaleDateString("sr-RS")}
                        </p>
                        {t.category && (
                          <Badge variant="outline" className="text-xs py-0">
                            {t.category.name}
                          </Badge>
                        )}
                        {t.referenceNum && (
                          <span className="text-xs text-muted-foreground">Br. {t.referenceNum}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 ${
                      t.type === "INCOME" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "-"}
                    {Number(t.amount).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
