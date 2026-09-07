import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
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
        <h1 className="text-2xl font-semibold">Нови станар</h1>
        <p className="text-sm text-muted-foreground mt-1">Додај корисника апликације</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createResident} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Име и презиме</Label>
              <Input id="name" name="name" placeholder="Петар Петровић" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Емаил</Label>
              <Input id="email" name="email" type="email" placeholder="petar@email.com" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Лозинка</Label>
              <Input id="password" name="password" type="text" placeholder="Почетна лозинка" required />
              <p className="text-xs text-muted-foreground">Станар може да промени лозинку након прве пријаве</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Број стана</Label>
                <Input id="unit" name="unit" placeholder="нпр. 12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input id="phone" name="phone" placeholder="Опционо" />
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
                  placeholder="нпр. 54.30"
                />
                <p className="text-xs text-muted-foreground">За власнички удео при гласању.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <SubmitButton className="flex-1">Додај станара</SubmitButton>
              <Button type="button" variant="outline" render={<Link href="/dashboard/stanari" />}>
                Откажи
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
