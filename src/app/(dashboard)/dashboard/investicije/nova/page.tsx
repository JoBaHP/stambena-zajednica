import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createInvestment } from "@/server/actions/investicije"
import Link from "next/link"

export default async function NovaInvesticijaPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova investicija</h1>
        <p className="text-sm text-muted-foreground mt-1">Evidentiraj investicioni projekat</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createInvestment} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Naziv</Label>
              <Input
                id="title"
                name="title"
                placeholder="npr. Renoviranje fasade"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detalji o investiciji..."
                rows={3}
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
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="PLANNED">Planirano</option>
                <option value="IN_PROGRESS">U toku</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Pocetak</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Zavrsetak</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Sacuvaj</Button>
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
