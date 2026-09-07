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
          Назад
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
              {!user.active && <Badge variant="destructive">Приступ уклоњен</Badge>}
              {user.role === "MANAGER" && <Badge>Управник</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {user.unit ? `Stan ${user.unit}` : "Без додељеног стана"}
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
            <CardTitle className="text-base">Власнички удео</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold tracking-tight nums">
                {sharePct.toFixed(1).replace(".", ",")}%
              </span>
              <span className="text-sm text-muted-foreground nums">
                {myArea.toLocaleString("sr-RS")} од {totalArea.toLocaleString("sr-RS")} m²
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
              Толико носи глас овог стана. Кворум и одлуке рачунају се по квадратури.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Подаци</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateUser.bind(null, id)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Име и презиме</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Емаил</Label>
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
                <Label htmlFor="phone">Телефон</Label>
                <Input id="phone" name="phone" defaultValue={user.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Стан</Label>
                <Input id="unit" name="unit" defaultValue={user.unit ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Квадратура (m²)</Label>
                <Input
                  id="area"
                  name="area"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  defaultValue={user.area ? String(user.area) : ""}
                />
                <p className="text-xs text-muted-foreground">За власнички удео при гласању.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Улога</Label>
              <select
                id="role"
                name="role"
                defaultValue={user.role}
                disabled={isSelf}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="RESIDENT">Станар</option>
                <option value="MANAGER">Управник</option>
              </select>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  Не можете променити своју улогу
                </p>
              )}
            </div>

            <SubmitButton>Сачувај измене</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ресетуј лозинку</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={resetUserPassword.bind(null, id)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="password">Нова лозинка</Label>
              <Input
                id="password"
                name="password"
                type="text"
                placeholder="Најмање 6 карактера"
                required
              />
              <p className="text-xs text-muted-foreground">
                Саопшти је кориснику да је промени након пријаве.
              </p>
            </div>
            <SubmitButton variant="outline">
              Постави нову лозинку
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Приступ</CardTitle>
        </CardHeader>
        <CardContent>
          {isSelf ? (
            <p className="text-sm text-muted-foreground">
              Не можете себи уклонити приступ.
            </p>
          ) : user.active ? (
            <form action={setUserActive.bind(null, id, false)}>
              <p className="text-sm text-muted-foreground mb-3">
                Корисник више неће моћи да се пријави. Историја (гласови,
                захтеви, трансакције) остаје сачувана. Можеш га вратити истим
                klikom kasnije.
              </p>
              <SubmitButton variant="destructive">
                Уклони приступ
              </SubmitButton>
            </form>
          ) : (
            <form action={setUserActive.bind(null, id, true)}>
              <p className="text-sm text-muted-foreground mb-3">
                Кориснику је уклоњен приступ. Кликом га враћаш у активно стање.
              </p>
              <SubmitButton>Врати приступ</SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
