import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadDocument } from "@/server/actions/arhiva"
import Link from "next/link"

export default async function NoviDokumentPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard/arhiva")

  const currentYear = new Date().getFullYear()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novi dokument</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Otpremi PDF, sliku ili Word/Excel dokument (max 20MB)
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={uploadDocument} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Naziv</Label>
              <Input
                id="title"
                name="title"
                placeholder="npr. Zapisnik sa skupstine 15.04.2026."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Napomena (opciono)</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                placeholder="Kratak opis dokumenta..."
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
                  <option value="MINUTES">Zapisnik</option>
                  <option value="CONTRACT">Ugovor</option>
                  <option value="INVOICE">Racun</option>
                  <option value="REPORT">Izvestaj</option>
                  <option value="REGULATION">Pravilnik</option>
                  <option value="OTHER">Ostalo</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Godina</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  min={2000}
                  max={2100}
                  defaultValue={currentYear}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Fajl</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                required
              />
              <p className="text-xs text-muted-foreground">
                Podrzano: PDF, slike (JPG/PNG/WebP), Word, Excel · max 20MB
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Za racune:</strong> imenuj fajl sa prefiksom meseca (JAN, FEB, MAR, APR, MAJ, JUN, JUL, AVG, SEP, OKT, NOV, DEC) — npr. <code>MAR_2_Izrada Kljuceva.pdf</code>. Fajl ce biti smesten u folder za odabranu godinu i mesec.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">
                Otpremi
              </Button>
              <Button
                type="button"
                variant="outline"
                render={<Link href="/dashboard/arhiva" />}
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
