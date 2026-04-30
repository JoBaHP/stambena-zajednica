import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createRequest } from "@/server/actions/zahtevi"
import Link from "next/link"

export default async function NoviZahtevPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novi zahtev za intervenciju</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prijavite kvar ili problem u zgradi
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createRequest} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Naslov</Label>
              <Input
                id="title"
                name="title"
                placeholder="npr. Curi voda u podrumu"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis problema</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detaljno opisite sta se desava, kada je poceo problem..."
                rows={5}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategorija</Label>
                <select
                  id="category"
                  name="category"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="PLUMBING">Vodovod</option>
                  <option value="ELECTRICAL">Elektrika</option>
                  <option value="ELEVATOR">Lift</option>
                  <option value="HEATING">Grejanje</option>
                  <option value="CLEANING">Ciscenje</option>
                  <option value="STRUCTURAL">Gradjevinski</option>
                  <option value="OTHER">Ostalo</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioritet</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="NORMAL"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="LOW">Nizak</option>
                  <option value="NORMAL">Normalan</option>
                  <option value="HIGH">Visok</option>
                  <option value="URGENT">Hitno</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokacija (opciono)</Label>
              <Input
                id="location"
                name="location"
                placeholder="npr. Stan 12, hodnik 3. sprat, podrum"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                Posalji zahtev
              </Button>
              <Button
                type="button"
                variant="outline"
                render={<Link href="/dashboard/zahtevi" />}
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
