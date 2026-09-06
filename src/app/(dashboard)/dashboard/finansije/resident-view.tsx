import { db } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, FolderArchive } from "lucide-react"
import { moduleAccent } from "@/lib/modules"

// Boje serija su provalidirane za daltonizam (CVD ΔE 9.2) na svetloj podlozi.
// Aqua je ispod 3:1 kontrasta, pa svaki iznos mora da stoji ispisan pored trake.
const INCOME = "bg-[#1baf7a] dark:bg-[#199e70]"
const EXPENSE = "bg-[#eb6834] dark:bg-[#d95926]"

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Avg", "Sep", "Okt", "Nov", "Dec",
]

function rsd(value: number): string {
  return `${Math.round(value).toLocaleString("sr-RS")} RSD`
}

function rsd2(value: number): string {
  return `${value.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD`
}

export async function ResidentFinanceView() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  // Pocetak meseca pre 11 meseci — zajedno sa tekucim daje 12 meseci.
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [allTime, recentTx, lastTx] = await Promise.all([
    db.transaction.groupBy({ by: ["type"], _sum: { amount: true } }),
    db.transaction.findMany({
      where: { date: { gte: windowStart } },
      select: { type: true, amount: true, date: true, categoryId: true },
    }),
    db.transaction.findMany({
      orderBy: { date: "desc" },
      take: 20,
      include: { category: { select: { name: true } } },
    }),
  ])

  const sumOf = (type: string) =>
    Number(allTime.find((g) => g.type === type)?._sum.amount ?? 0)
  const balance = sumOf("INCOME") - sumOf("EXPENSE")

  const thisMonth = recentTx.filter((t) => t.date >= monthStart)
  const monthIncome = thisMonth
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0)
  const monthExpense = thisMonth
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount), 0)

  // ─── Po mesecima ───────────────────────────────────────────────────────────
  const buckets = new Map<string, { label: string; income: number; expense: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, {
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      income: 0,
      expense: 0,
    })
  }
  for (const t of recentTx) {
    const key = `${t.date.getFullYear()}-${t.date.getMonth()}`
    const b = buckets.get(key)
    if (!b) continue
    if (t.type === "INCOME") b.income += Number(t.amount)
    else b.expense += Number(t.amount)
  }
  const months = [...buckets.values()]
  const monthMax = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)))

  // ─── Rashodi po kategorijama ───────────────────────────────────────────────
  const categories = await db.transactionCategory.findMany({
    select: { id: true, name: true },
  })
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const byCategory = new Map<string, number>()
  for (const t of recentTx) {
    if (t.type !== "EXPENSE") continue
    const name = t.categoryId ? (catName.get(t.categoryId) ?? "Ostalo") : "Bez kategorije"
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(t.amount))
  }
  const catRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
  const catTotal = catRows.reduce((s, [, v]) => s + v, 0)
  const catMax = Math.max(1, ...catRows.map(([, v]) => v))

  const hasData = recentTx.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: moduleAccent.finansije.tint }}
        >
          <ArrowLeftRight
            className="w-5 h-5"
            style={{ color: moduleAccent.finansije.color }}
          />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finansije zajednice</h1>
          <p className="text-sm text-muted-foreground">
            Isti podaci koje vodi upravnik — samo za uvid
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <Card className="card-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stanje racuna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight nums">{rsd2(balance)}</p>
            <p className="text-xs text-muted-foreground mt-1">Od pocetka evidencije</p>
          </CardContent>
        </Card>

        <Card className="card-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-sm ${INCOME}`} />
              Uplate ovog meseca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight nums">{rsd2(monthIncome)}</p>
          </CardContent>
        </Card>

        <Card className="card-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-sm ${EXPENSE}`} />
              Rashodi ovog meseca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight nums">{rsd2(monthExpense)}</p>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Jos uvek nema evidentiranih stavki u poslednjih 12 meseci.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Poslednjih 12 meseci</CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block w-3 h-2 rounded-[2px] ${INCOME}`} />
                  Uplate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block w-3 h-2 rounded-[2px] ${EXPENSE}`} />
                  Rashodi
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {months.map((m) => (
                  <li key={m.label} className="grid grid-cols-[3.5rem_1fr] gap-3 items-center">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {m.label}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 rounded-r-[4px] ${INCOME}`}
                          style={{ width: `${(m.income / monthMax) * 100}%` }}
                        />
                        <span className="text-xs nums text-muted-foreground whitespace-nowrap">
                          {rsd(m.income)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 rounded-r-[4px] ${EXPENSE}`}
                          style={{ width: `${(m.expense / monthMax) * 100}%` }}
                        />
                        <span className="text-xs nums text-muted-foreground whitespace-nowrap">
                          {rsd(m.expense)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Na sta je novac potrosen</CardTitle>
              <p className="text-xs text-muted-foreground pt-1">
                Rashodi po kategorijama, poslednjih 12 meseci
              </p>
            </CardHeader>
            <CardContent>
              {catRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema evidentiranih rashoda.</p>
              ) : (
                <ul className="space-y-3">
                  {catRows.map(([name, value]) => (
                    <li key={name} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm truncate">{name}</span>
                        <span className="text-sm nums whitespace-nowrap">
                          {rsd(value)}{" "}
                          <span className="text-muted-foreground">
                            ({((value / catTotal) * 100).toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-r-[4px] bg-primary"
                        style={{ width: `${(value / catMax) * 100}%` }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="card-lift">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Poslednje stavke</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lastTx.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-6">Nema stavki.</p>
          ) : (
            <ul className="divide-y">
              {lastTx.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("sr-RS")}
                      {t.category ? ` · ${t.category.name}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm tabular-nums whitespace-nowrap ${
                      t.type === "INCOME" ? "text-[#1baf7a]" : "text-[#eb6834]"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "−"}
                    {rsd2(Number(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-sm text-muted-foreground">
            Racuni i ugovori se nalaze u digitalnoj arhivi.
          </p>
          <Button variant="outline" render={<Link href="/dashboard/arhiva" />}>
            <FolderArchive className="w-4 h-4 mr-2" />
            Otvori arhivu
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
