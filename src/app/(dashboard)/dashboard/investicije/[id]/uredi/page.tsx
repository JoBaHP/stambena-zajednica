import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateInvestment } from "@/server/actions/investicije"
import Link from "next/link"

export default async function UrediInvesticijuPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params

  const investment = await db.investment.findUnique({ where: { id } })
  if (!investment) notFound()

  const updateWithId = updateInvestment.bind(null, investment.id)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Izmeni investiciju</h1>
        <p className="text-sm text-muted-foreground mt-1">Azuriraj podatke investicionog projekta</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={updateWithId} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Naziv</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={investment.title}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={investment.description ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budzet (RSD)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={Number(investment.budget).toString()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spent">Potroseno (RSD)</Label>
              <Input
                id="spent"
                name="spent"
                type="number"
                step="0.01"
                min="0"
                defaultValue={Number(investment.spent).toString()}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Pocetak</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={
                    investment.startDate
                      ? new Date(investment.startDate).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Zavrsetak</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={
                    investment.endDate
                      ? new Date(investment.endDate).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Sacuvaj izmene</Button>
              <Button type="button" variant="outline" render={<Link href="/dashboard/investicije" />}>
                Otkazi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
