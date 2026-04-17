import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateContact } from "@/server/actions/kontakti"
import Link from "next/link"

export default async function UrediKontaktPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params

  const contact = await db.contact.findUnique({ where: { id } })
  if (!contact) notFound()

  const updateWithId = updateContact.bind(null, contact.id)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Izmeni kontakt</h1>
        <p className="text-sm text-muted-foreground mt-1">Azuriraj podatke kontakta</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={updateWithId} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Naziv</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={contact.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                defaultValue={contact.phone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategorija</Label>
              <select
                id="category"
                name="category"
                required
                defaultValue={contact.category}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="EMERGENCY">Hitne sluzbe</option>
                <option value="MANAGEMENT">Upravnik</option>
                <option value="MAINTENANCE">Odrzavanje</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Napomena</Label>
              <Input
                id="note"
                name="note"
                defaultValue={contact.note ?? ""}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Sacuvaj izmene</Button>
              <Button type="button" variant="outline" render={<Link href="/dashboard/kontakti" />}>
                Otkazi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
