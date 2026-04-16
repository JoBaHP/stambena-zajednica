import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createResident } from "@/server/actions/stanari"
import Link from "next/link"

export default async function NoviStanarPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novi stanar</h1>
        <p className="text-sm text-muted-foreground mt-1">Dodaj korisnika aplikacije</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createResident} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Ime i prezime</Label>
              <Input id="name" name="name" placeholder="Petar Petrovic" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="petar@email.com" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Lozinka</Label>
              <Input id="password" name="password" type="text" placeholder="Pocetna lozinka" required />
              <p className="text-xs text-muted-foreground">Stanar moze da promeni lozinku nakon prve prijave</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Broj stana</Label>
                <Input id="unit" name="unit" placeholder="npr. 12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" placeholder="Opciono" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Dodaj stanara</Button>
              <Button type="button" variant="outline" render={<Link href="/dashboard/stanari" />}>
                Otkazi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
