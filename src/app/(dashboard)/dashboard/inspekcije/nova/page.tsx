import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createInspection } from "@/server/actions/inspekcije"
import Link from "next/link"

export default async function NovaInspekcija() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova inspekcija</h1>
        <p className="text-sm text-muted-foreground mt-1">Evidentiraj PP inspekciju</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createInspection} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Naziv</Label>
              <Input
                id="title"
                name="title"
                placeholder="npr. Godisnja PP inspekcija"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspectionDate">Datum inspekcije</Label>
              <Input
                id="inspectionDate"
                name="inspectionDate"
                type="date"
                required
                defaultValue={today}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="result">Rezultat</Label>
              <select
                id="result"
                name="result"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="PASSED">Proslo</option>
                <option value="FAILED">Nije proslo</option>
                <option value="CONDITIONAL">Uslovno</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextDueDate">Sledeca inspekcija</Label>
              <Input id="nextDueDate" name="nextDueDate" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector">Inspektor</Label>
              <Input id="inspector" name="inspector" placeholder="Ime inspektora" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Napomena</Label>
              <Textarea id="notes" name="notes" placeholder="Opciono" rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Sacuvaj</Button>
              <Button type="button" variant="outline" render={<Link href="/dashboard/inspekcije" />}>
                Otkazi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
