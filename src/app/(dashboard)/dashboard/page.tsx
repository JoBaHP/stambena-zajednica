import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Megaphone,
  Vote,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  const isManager = session?.user.role === "MANAGER"

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalIncome,
    totalExpense,
    monthlyIncome,
    monthlyExpense,
    activeAnnouncements,
    activePolls,
    upcomingInspections,
    activeInvestments,
    recentTransactions,
  ] = await Promise.all([
    db.transaction.aggregate({ where: { type: "INCOME" }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { type: "EXPENSE" }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { type: "INCOME", date: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { type: "EXPENSE", date: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.announcement.count({ where: { publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    db.poll.count({ where: { status: "ACTIVE" } }),
    db.pPInspection.count({ where: { nextDueDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } } }),
    db.investment.count({ where: { status: "IN_PROGRESS" } }),
    db.transaction.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { category: true },
    }),
  ])

  const balance =
    Number(totalIncome._sum.amount ?? 0) - Number(totalExpense._sum.amount ?? 0)

  const monthBalance =
    Number(monthlyIncome._sum.amount ?? 0) - Number(monthlyExpense._sum.amount ?? 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Dobro jutro{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Pregled stambene zajednice Pasterova 16</p>
      </div>

      {isManager && (
        <>
          {/* Finansijski pregled */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stanje racuna</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {balance.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ukupno prihodi - rashodi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ovaj mesec</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  {monthBalance >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <p className={`text-2xl font-bold ${monthBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {monthBalance.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +{Number(monthlyIncome._sum.amount ?? 0).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} /
                  -{Number(monthlyExpense._sum.amount ?? 0).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">PP Inspekcije</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{upcomingInspections}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {upcomingInspections > 0 ? "Rokovi u narednih 30 dana" : "Nema rokova uskoro"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Investicije</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{activeInvestments}</p>
                <p className="text-xs text-muted-foreground mt-1">Projekata u toku</p>
              </CardContent>
            </Card>
          </div>

          {/* Nedavne transakcije */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Nedavne transakcije</CardTitle>
              <Link href="/dashboard/finansije" className="text-sm text-muted-foreground hover:text-foreground">
                Sve →
              </Link>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nema transakcija</p>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {t.type === "INCOME" ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-500 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.date).toLocaleDateString("sr-RS")}
                            {t.category && ` · ${t.category.name}`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          t.type === "INCOME" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "INCOME" ? "+" : "-"}
                        {Number(t.amount).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Zajednicke kartice (za sve) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/obavestenja">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Obavestenja
                </CardTitle>
                {activeAnnouncements > 0 && (
                  <Badge variant="secondary">{activeAnnouncements}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {activeAnnouncements > 0
                  ? `${activeAnnouncements} aktivnih obavestenja`
                  : "Nema novih obavestenja"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/glasanje">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Vote className="w-4 h-4" /> Glasanje
                </CardTitle>
                {activePolls > 0 && (
                  <Badge variant="destructive">{activePolls}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {activePolls > 0
                  ? `${activePolls} aktivnih glasanja`
                  : "Nema aktivnih glasanja"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
