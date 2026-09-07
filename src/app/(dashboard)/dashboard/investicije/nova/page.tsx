import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createInvestment } from "@/server/actions/investicije"
import Link from "next/link"

export default async function NovaInvesticijaPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Нова инвестиција</h1>
        <p className="text-sm text-muted-foreground mt-1">Евидентирај инвестициони пројекат</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createInvestment} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Назив</Label>
              <Input
                id="title"
                name="title"
                placeholder="нпр. Реновирање фасаде"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Детаљи о инвестицији..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Буџет (РСД)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <select
                id="status"
                name="status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="PLANNED">Планирано</option>
                <option value="IN_PROGRESS">У току</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Почетак</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Завршетак</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <SubmitButton className="flex-1">Сачувај</SubmitButton>
              <Button type="button" variant="outline" render={<Link href="/dashboard/investicije" />}>
                Откажи
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
