import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Calendar } from "lucide-react"
import { deleteInvestment, updateInvestmentSpent } from "@/server/actions/investicije"
import Link from "next/link"

const statusConfig = {
  PLANNED: { label: "Planirano", variant: "outline" as const },
  IN_PROGRESS: { label: "U toku", variant: "default" as const },
  COMPLETED: { label: "Zavrseno", variant: "secondary" as const },
  CANCELLED: { label: "Otkazano", variant: "destructive" as const },
}

export default async function InvesticijaDetaljPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params

  const investment = await db.investment.findUnique({
    where: { id },
    include: { documents: true },
  })

  if (!investment) notFound()

  const config = statusConfig[investment.status]
  const progress = Number(investment.budget) > 0
    ? (Number(investment.spent) / Number(investment.budget)) * 100
    : 0

  const deleteWithId = deleteInvestment.bind(null, investment.id)
  const updateWithId = updateInvestmentSpent.bind(null, investment.id)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{investment.title}</h1>
          {investment.description && (
            <p className="text-sm text-muted-foreground mt-1">{investment.description}</p>
          )}
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Finansijski pregled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Budzet</span>
            <span className="text-sm font-bold">
              {Number(investment.budget).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Potroseno</span>
            <span className="text-sm font-bold text-amber-600">
              {Number(investment.spent).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Preostalo</span>
            <span className="text-sm font-bold text-green-600">
              {(Number(investment.budget) - Number(investment.spent)).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
            </span>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Napredak</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress > 100 ? "bg-red-500" : "bg-slate-900"
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalji</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {investment.startDate && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Pocetak
              </span>
              <span className="text-sm">
                {new Date(investment.startDate).toLocaleDateString("sr-RS")}
              </span>
            </div>
          )}

          {investment.endDate && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Zavrsetak
              </span>
              <span className="text-sm">
                {new Date(investment.endDate).toLocaleDateString("sr-RS")}
              </span>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Evidentirano: {new Date(investment.createdAt).toLocaleString("sr-RS")}
          </div>
        </CardContent>
      </Card>

      {/* Azuriranje potrosenog iznosa */}
      {(investment.status === "IN_PROGRESS" || investment.status === "PLANNED") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Azuriraj</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateWithId} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="spent">Potroseno (RSD)</Label>
                <Input
                  id="spent"
                  name="spent"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(investment.spent).toString()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={investment.status}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="PLANNED">Planirano</option>
                  <option value="IN_PROGRESS">U toku</option>
                  <option value="COMPLETED">Zavrseno</option>
                  <option value="CANCELLED">Otkazano</option>
                </select>
              </div>
              <Button type="submit">Sacuvaj izmene</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" render={<Link href="/dashboard/investicije" />}>
          Nazad
        </Button>
        <form action={deleteWithId}>
          <Button variant="destructive" type="submit">
            <Trash2 className="w-4 h-4 mr-2" />
            Obrisi
          </Button>
        </form>
      </div>
    </div>
  )
}
