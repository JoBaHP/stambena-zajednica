import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createTask } from "@/server/actions/kalendar"
import Link from "next/link"

export default async function NovaObavezaPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard/kalendar")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova obaveza</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dodajte rok ili zakazanu aktivnost u kalendar
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createTask} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Naslov</Label>
              <Input
                id="title"
                name="title"
                placeholder="npr. PP inspekcija lifta"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Napomena (opciono)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detalji, kontakti, broj ugovora..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Datum</Label>
                <Input id="dueDate" name="dueDate" type="date" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategorija</Label>
                <select
                  id="category"
                  name="category"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="INSPECTION">Inspekcija</option>
                  <option value="MAINTENANCE">Odrzavanje</option>
                  <option value="PAYMENT">Placanje</option>
                  <option value="MEETING">Sastanak</option>
                  <option value="CONTRACT">Ugovor</option>
                  <option value="OTHER">Ostalo</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence">Ponavljanje</Label>
              <select
                id="recurrence"
                name="recurrence"
                defaultValue="NONE"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="NONE">Bez ponavljanja</option>
                <option value="MONTHLY">Mesecno</option>
                <option value="QUARTERLY">Kvartalno</option>
                <option value="YEARLY">Godisnje</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Kada oznacis obavezu kao zavrsenu, automatski ce se kreirati nova za sledeci period.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                Sacuvaj
              </Button>
              <Button
                type="button"
                variant="outline"
                render={<Link href="/dashboard/kalendar" />}
              >
                Otkazi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
