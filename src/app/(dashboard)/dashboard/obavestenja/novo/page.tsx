import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createAnnouncement } from "@/server/actions/obavestenja"
import Link from "next/link"

export default async function NovoObavestenjePage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo obavestenje</h1>
        <p className="text-sm text-muted-foreground mt-1">Objavi obavestenje na oglasnu tablu</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createAnnouncement} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Naslov</Label>
              <Input id="title" name="title" placeholder="npr. Remont lifta" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Tekst</Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Sadrzaj obavestenja..."
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioritet</Label>
              <select
                id="priority"
                name="priority"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="NORMAL">Normalan</option>
                <option value="URGENT">Hitno</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPinned"
                name="isPinned"
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPinned" className="font-normal">Zakaci na vrh</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Istice (opciono)</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Objavi</Button>
              <Button type="button" variant="outline" render={<Link href="/dashboard/obavestenja" />}>
                Otkazi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
