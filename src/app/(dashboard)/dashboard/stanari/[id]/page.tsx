import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  updateUser,
  resetUserPassword,
  setUserActive,
} from "@/server/actions/stanari"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function EditStanarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params
  const user = await db.user.findUnique({ where: { id } })
  if (!user) notFound()

  const isSelf = session.user.id === id

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/stanari" />}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Nazad
        </Button>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          {!user.active && <Badge variant="destructive">Pristup uklonjen</Badge>}
          {user.role === "MANAGER" && <Badge>Upravnik</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Podaci</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateUser.bind(null, id)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Ime i prezime</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" defaultValue={user.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Stan</Label>
                <Input id="unit" name="unit" defaultValue={user.unit ?? ""} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Uloga</Label>
              <select
                id="role"
                name="role"
                defaultValue={user.role}
                disabled={isSelf}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="RESIDENT">Stanar</option>
                <option value="MANAGER">Upravnik</option>
              </select>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  Ne mozete promeniti svoju ulogu
                </p>
              )}
            </div>

            <Button type="submit">Sacuvaj izmene</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resetuj lozinku</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={resetUserPassword.bind(null, id)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="password">Nova lozinka</Label>
              <Input
                id="password"
                name="password"
                type="text"
                placeholder="Najmanje 6 karaktera"
                required
              />
              <p className="text-xs text-muted-foreground">
                Saopsti je korisniku da je promeni nakon prijave.
              </p>
            </div>
            <Button type="submit" variant="outline">
              Postavi novu lozinku
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pristup</CardTitle>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              Ne mozete sebi ukloniti pristup.
            </p>
          ) : user.active ? (
            <form action={setUserActive.bind(null, id, false)}>
              <p className="text-sm text-muted-foreground mb-3">
                Korisnik vise nece moci da se prijavi. Istorija (glasovi,
                zahtevi, transakcije) ostaje sacuvana. Mozes ga vratiti istim
                klikom kasnije.
              </p>
              <Button type="submit" variant="destructive">
                Ukloni pristup
              </Button>
            </form>
          ) : (
            <form action={setUserActive.bind(null, id, true)}>
              <p className="text-sm text-muted-foreground mb-3">
                Korisniku je uklonjen pristup. Klikom ga vracas u aktivno stanje.
              </p>
              <Button type="submit">Vrati pristup</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
