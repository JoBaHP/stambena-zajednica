import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Calendar, Gavel, ChevronRight, FileText, Users } from "lucide-react"
import { deleteInvestment, updateInvestmentSpent } from "@/server/actions/investicije"
import { createTender } from "@/server/actions/tenderi"
import { ConfirmDelete } from "@/components/confirm-delete"
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
    include: {
      documents: true,
      tender: {
        include: { _count: { select: { offers: true, votes: true } } },
      },
    },
  })

  if (!investment) notFound()

  const config = statusConfig[investment.status]
  const progress = Number(investment.budget) > 0
    ? (Number(investment.spent) / Number(investment.budget)) * 100
    : 0

  const deleteWithId = deleteInvestment.bind(null, investment.id)
  const updateWithId = updateInvestmentSpent.bind(null, investment.id)
  const createTenderForInvestment = createTender.bind(null, investment.id)

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
              <SubmitButton>Sacuvaj izmene</SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tender sekcija */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="w-4 h-4" />
            Tender — ponude kompanija
          </CardTitle>
        </CardHeader>
        <CardContent>
          {investment.tender ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{investment.tender.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {investment.tender._count.offers} ponuda
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {investment.tender._count.votes} glasova
                    </span>
                  </div>
                </div>
                <Badge variant={investment.tender.status === "OPEN" ? "default" : "secondary"}>
                  {investment.tender.status === "OPEN" ? "Aktivno" : "Zatvoreno"}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/dashboard/tenderi/${investment.tender.id}`} />}
              >
                Upravljaj tenderom
                <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          ) : (
            <form action={createTenderForInvestment} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Kreirajte tender da biste dodali ponude kompanija i omogućili glasanje stanarima.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="tender-title">Naziv tendera</Label>
                <Input
                  id="tender-title"
                  name="title"
                  required
                  placeholder={`npr. ${investment.title} — prikupljanje ponuda`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tender-desc">Opis (opciono)</Label>
                <Textarea
                  id="tender-desc"
                  name="description"
                  rows={2}
                  placeholder="Šta se traži, kriterijumi izbora..."
                />
              </div>
              <SubmitButton size="sm">
                <Gavel className="w-3.5 h-3.5 mr-1.5" />
                Kreiraj tender
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" render={<Link href="/dashboard/investicije" />}>
          Nazad
        </Button>
        <Button className="flex-1" render={<Link href={`/dashboard/investicije/${investment.id}/uredi`} />}>
          <Pencil className="w-4 h-4 mr-2" />
          Izmeni
        </Button>
        <ConfirmDelete action={deleteWithId} />
      </div>
    </div>
  )
}
