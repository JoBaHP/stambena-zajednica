import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateInspection } from "@/server/actions/inspekcije"
import Link from "next/link"

export default async function UrediInspekcijaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params

  const inspection = await db.pPInspection.findUnique({ where: { id } })
  if (!inspection) notFound()

  const updateWithId = updateInspection.bind(null, inspection.id)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Измени инспекцију</h1>
        <p className="text-sm text-muted-foreground mt-1">Ажурирај податке ПП инспекције</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={updateWithId} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Назив</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={inspection.title}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspectionDate">Датум инспекције</Label>
              <Input
                id="inspectionDate"
                name="inspectionDate"
                type="date"
                required
                defaultValue={new Date(inspection.inspectionDate).toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="result">Резултат</Label>
              <select
                id="result"
                name="result"
                required
                defaultValue={inspection.result}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="PASSED">Прошло</option>
                <option value="FAILED">Није прошло</option>
                <option value="CONDITIONAL">Условно</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextDueDate">Следећа инспекција</Label>
              <Input
                id="nextDueDate"
                name="nextDueDate"
                type="date"
                defaultValue={
                  inspection.nextDueDate
                    ? new Date(inspection.nextDueDate).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector">Инспектор</Label>
              <Input
                id="inspector"
                name="inspector"
                defaultValue={inspection.inspector ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Напомена</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={inspection.notes ?? ""}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <SubmitButton className="flex-1">Сачувај измене</SubmitButton>
              <Button type="button" variant="outline" render={<Link href="/dashboard/inspekcije" />}>
                Откажи
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
