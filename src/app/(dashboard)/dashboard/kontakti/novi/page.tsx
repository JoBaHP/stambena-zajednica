import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createContact } from "@/server/actions/kontakti"
import Link from "next/link"

export default async function NoviKontaktPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Нови контакт</h1>
        <p className="text-sm text-muted-foreground mt-1">Додај контакт у именик</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createContact} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Назив</Label>
              <Input
                id="name"
                name="name"
                placeholder="нпр. Ватрогасци, Управник зграде..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="нпр. 011/123-4567"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категорија</Label>
              <select
                id="category"
                name="category"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="EMERGENCY">Хитне службе</option>
                <option value="MANAGEMENT">Управник</option>
                <option value="MAINTENANCE">Одржавање</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Напомена</Label>
              <Input
                id="note"
                name="note"
                placeholder="Опционо — нпр. радно време, адреса..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Сачувај</Button>
              <Button type="button" variant="outline" render={<Link href="/dashboard/kontakti" />}>
                Откажи
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
