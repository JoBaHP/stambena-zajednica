import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateAnnouncement, deleteAnnouncement } from "@/server/actions/obavestenja"
import { ConfirmDelete } from "@/components/confirm-delete"
import Link from "next/link"

export default async function UrediObavestenjePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params

  const announcement = await db.announcement.findUnique({ where: { id } })
  if (!announcement) notFound()

  const updateWithId = updateAnnouncement.bind(null, announcement.id)
  const deleteWithId = deleteAnnouncement.bind(null, announcement.id)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Измени обавештење</h1>
        <p className="text-sm text-muted-foreground mt-1">Ажурирај обавештење</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={updateWithId} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Наслов</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={announcement.title}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Текст</Label>
              <Textarea
                id="body"
                name="body"
                rows={6}
                required
                defaultValue={announcement.body}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет</Label>
              <select
                id="priority"
                name="priority"
                defaultValue={announcement.priority}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="NORMAL">Нормалан</option>
                <option value="URGENT">Хитно</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPinned"
                name="isPinned"
                className="h-4 w-4 rounded border-gray-300"
                defaultChecked={announcement.isPinned}
              />
              <Label htmlFor="isPinned" className="font-normal">Закачи на врх</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Истиче (опционо)</Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="date"
                defaultValue={
                  announcement.expiresAt
                    ? new Date(announcement.expiresAt).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <SubmitButton className="flex-1">Сачувај измене</SubmitButton>
              <Button type="button" variant="outline" render={<Link href="/dashboard/obavestenja" />}>
                Откажи
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDelete
        action={deleteWithId}
        label="Обриши обавештење"
        confirmLabel="Потврди брисање обавештења"
        className="w-full"
      />
    </div>
  )
}
