import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { createTenderOffer } from "@/server/actions/tenderi"

export default async function NovaPonudaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params
  const { error } = await searchParams

  const tender = await db.tender.findUnique({
    where: { id },
    select: { id: true, title: true, status: true },
  })
  if (!tender) notFound()
  if (tender.status === "CLOSED") redirect(`/dashboard/tenderi/${id}`)

  const action = createTenderOffer.bind(null, id)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova ponuda</h1>
        <p className="text-sm text-muted-foreground mt-1">{tender.title}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {decodeURIComponent(error)}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Podaci o ponudi</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} encType="multipart/form-data" className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company">Naziv kompanije *</Label>
              <Input id="company" name="company" required placeholder="npr. Securitas d.o.o." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price">Cena (RSD)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="npr. 150000"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Napomena</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Kratak opis ponude, uslovi, rokovi..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file">Dokument ponude</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.xml,.csv"
              />
              <p className="text-xs text-muted-foreground">
                PDF, Word, Excel, XML — maks 4MB. AI će automatski napraviti sažetak.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <SubmitButton>Dodaj ponudu</SubmitButton>
              <Button
                type="button"
                variant="outline"
                render={<Link href={`/dashboard/tenderi/${id}`} />}
              >
                Otkazi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
