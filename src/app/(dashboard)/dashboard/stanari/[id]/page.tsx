import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  updateUser,
  resetUserPassword,
  setUserActive,
} from "@/server/actions/stanari"
import { moduleAccent } from "@/lib/modules"
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

  // Vlasnicki udeo — koliko ovaj stan nosi na glasanju.
  const owners = await db.user.findMany({
    where: { active: true, unit: { not: null } },
    select: { area: true },
  })
  const myArea = Number(user.area ?? 0)
  const totalArea = owners.reduce((sum, o) => sum + Number(o.area ?? 0), 0)
  const sharePct = myArea > 0 && totalArea > 0 ? (myArea / totalArea) * 100 : null

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/dashboard/stanari" />}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Nazad
        </Button>

        <div className="mt-3 flex items-center gap-4">
          <span
            className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
            style={{
              background: moduleAccent.stanari.tint,
              color: moduleAccent.stanari.color,
            }}
          >
            {initials}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
              {!user.active && <Badge variant="destructive">Pristup uklonjen</Badge>}
              {user.role === "MANAGER" && <Badge>Upravnik</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {user.unit ? `Stan ${user.unit}` : "Bez dodeljenog stana"}
              {myArea > 0 && ` · ${myArea.toLocaleString("sr-RS")} m²`}
              {sharePct !== null &&
                ` · udeo ${sharePct.toFixed(1).replace(".", ",")}%`}
            </p>
          </div>
        </div>
      </div>

      {sharePct !== null && (
        <Card className="card-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vlasnicki udeo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold tracking-tight nums">
                {sharePct.toFixed(1).replace(".", ",")}%
              </span>
              <span className="text-sm text-muted-foreground nums">
                {myArea.toLocaleString("sr-RS")} od {totalArea.toLocaleString("sr-RS")} m²
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, sharePct)}%`,
                  background: moduleAccent.stanari.color,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Toliko nosi glas ovog stana. Kvorum i odluke racunaju se po kvadraturi.
            </p>
          </CardContent>
        </Card>
      )}

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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" defaultValue={user.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Stan</Label>
                <Input id="unit" name="unit" defaultValue={user.unit ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Kvadratura (m²)</Label>
                <Input
                  id="area"
                  name="area"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  defaultValue={user.area ? String(user.area) : ""}
                />
                <p className="text-xs text-muted-foreground">Za vlasnicki udeo pri glasanju.</p>
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

            <SubmitButton>Sacuvaj izmene</SubmitButton>
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
            <SubmitButton variant="outline">
              Postavi novu lozinku
            </SubmitButton>
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
              <SubmitButton variant="destructive">
                Ukloni pristup
              </SubmitButton>
            </form>
          ) : (
            <form action={setUserActive.bind(null, id, true)}>
              <p className="text-sm text-muted-foreground mb-3">
                Korisniku je uklonjen pristup. Klikom ga vracas u aktivno stanje.
              </p>
              <SubmitButton>Vrati pristup</SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
