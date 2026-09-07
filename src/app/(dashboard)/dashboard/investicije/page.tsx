import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, HardHat } from "lucide-react"
import Link from "next/link"

const statusConfig = {
  PLANNED: { label: "Планирано", variant: "outline" as const },
  IN_PROGRESS: { label: "У току", variant: "default" as const },
  COMPLETED: { label: "Завршено", variant: "secondary" as const },
  CANCELLED: { label: "Отказано", variant: "destructive" as const },
}

export default async function InvesticijePage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const investments = await db.investment.findMany({
    orderBy: { createdAt: "desc" },
    include: { documents: true },
  })

  const totalBudget = investments.reduce((s, i) => s + Number(i.budget), 0)
  const totalSpent = investments.reduce((s, i) => s + Number(i.spent), 0)
  const inProgress = investments.filter((i) => i.status === "IN_PROGRESS")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Инвестиције</h1>
          <p className="text-sm text-muted-foreground mt-1">Инвестициона улагања и капитални пројекти</p>
        </div>
        <Button render={<Link href="/dashboard/investicije/nova" />}>
          <Plus className="w-4 h-4 mr-2" />
          Нова инвестиција
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Укупни буџет</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalBudget.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} РСД
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Потрошено</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {totalSpent.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} РСД
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Пројеката у току</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{inProgress.length}</p>
          </CardContent>
        </Card>
      </div>

      {investments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <HardHat className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Нема евидентираних инвестиција</p>
            <Button
              className="mt-4"
              variant="outline"
              render={<Link href="/dashboard/investicije/nova" />}
            >
              Додај прву инвестицију
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {investments.map((inv) => {
            const config = statusConfig[inv.status]
            const progress = Number(inv.budget) > 0 ? (Number(inv.spent) / Number(inv.budget)) * 100 : 0
            return (
              <Link key={inv.id} href={`/dashboard/investicije/${inv.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-medium text-sm">{inv.title}</p>
                        {inv.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{inv.description}</p>
                        )}
                      </div>
                      <Badge variant={config.variant} className="shrink-0 text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {Number(inv.spent).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} /{" "}
                          {Number(inv.budget).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} РСД
                        </span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
