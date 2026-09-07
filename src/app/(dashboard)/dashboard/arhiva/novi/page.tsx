import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadDocument } from "@/server/actions/arhiva"
import Link from "next/link"

export default async function NoviDokumentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard/arhiva")

  const { error } = await searchParams
  const currentYear = new Date().getFullYear()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Нови документ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Отпреми PDF, слику или Word/Excel документ (макс 4MB)
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form action={uploadDocument} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Назив</Label>
              <Input
                id="title"
                name="title"
                placeholder="нпр. Записник са скупштине 15.04.2026."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Напомена (опционо)</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                placeholder="Кратак опис документа..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Категорија</Label>
                <select
                  id="category"
                  name="category"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="MINUTES">Записник</option>
                  <option value="CONTRACT">Уговор</option>
                  <option value="INVOICE">Рачун</option>
                  <option value="REPORT">Извештај</option>
                  <option value="REGULATION">Правилник</option>
                  <option value="OTHER">Остало</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Година</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  min={2000}
                  max={2100}
                  defaultValue={currentYear}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Фајл</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                required
              />
              <p className="text-xs text-muted-foreground">
                Подржано: PDF, слике (JPG/PNG/WebP), Word, Excel · макс 4MB.{" "}
                Ако је фајл већи, компресуј га на{" "}
                <a
                  href="https://www.ilovepdf.com/compress_pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  ilovepdf.com
                </a>{" "}
                pre uploada.
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>За рачуне:</strong> imenuj fajl sa prefiksom meseca (JAN, FEB, MAR, APR, MAJ, JUN, JUL, AVG, SEP, OKT, NOV, DEC) — npr. <code>MAR_2_Izrada Kljuceva.pdf</code>.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <SubmitButton className="flex-1">
                Отпреми
              </SubmitButton>
              <Button
                type="button"
                variant="outline"
                render={<Link href="/dashboard/arhiva" />}
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
