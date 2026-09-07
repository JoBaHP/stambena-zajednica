import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateTask } from "@/server/actions/kalendar"
import Link from "next/link"

export default async function UrediObavezuPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard/kalendar")

  const task = await db.task.findUnique({ where: { id } })
  if (!task) notFound()

  const dueIso = task.dueDate.toISOString().slice(0, 10)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Уреди обавезу</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Измени детаље обавезе
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={updateTask.bind(null, task.id)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Наслов</Label>
              <Input
                id="title"
                name="title"
                defaultValue={task.title}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Напомена (опционо)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={task.description ?? ""}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Датум</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  defaultValue={dueIso}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Категорија</Label>
                <select
                  id="category"
                  name="category"
                  required
                  defaultValue={task.category}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="INSPECTION">Инспекција</option>
                  <option value="MAINTENANCE">Одржавање</option>
                  <option value="PAYMENT">Плаћање</option>
                  <option value="MEETING">Састанак</option>
                  <option value="CONTRACT">Уговор</option>
                  <option value="OTHER">Остало</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrence">Понављање</Label>
              <select
                id="recurrence"
                name="recurrence"
                defaultValue={task.recurrence}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="NONE">Без понављања</option>
                <option value="MONTHLY">Месечно</option>
                <option value="QUARTERLY">Квартално</option>
                <option value="YEARLY">Годишње</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <SubmitButton className="flex-1">
                Сачувај
              </SubmitButton>
              <Button
                type="button"
                variant="outline"
                render={<Link href="/dashboard/kalendar" />}
              >
                Откажи
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
