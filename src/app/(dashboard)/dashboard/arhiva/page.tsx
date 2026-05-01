import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  FileText,
  Download,
  ScrollText,
  FileSignature,
  Receipt,
  ClipboardList,
  Scale,
  File,
} from "lucide-react"
import Link from "next/link"
import { deleteDocument } from "@/server/actions/arhiva"
import { ConfirmDelete } from "@/components/confirm-delete"

const categoryConfig = {
  MINUTES: { label: "Zapisnici", icon: ScrollText, color: "text-blue-600" },
  CONTRACT: { label: "Ugovori", icon: FileSignature, color: "text-purple-600" },
  INVOICE: { label: "Racuni", icon: Receipt, color: "text-emerald-600" },
  REPORT: { label: "Izvestaji", icon: ClipboardList, color: "text-amber-600" },
  REGULATION: { label: "Pravilnici", icon: Scale, color: "text-slate-700" },
  OTHER: { label: "Ostalo", icon: File, color: "text-slate-500" },
}

const categoryOrder: Array<keyof typeof categoryConfig> = [
  "MINUTES",
  "CONTRACT",
  "INVOICE",
  "REPORT",
  "REGULATION",
  "OTHER",
]

const RESIDENT_VISIBLE: Array<keyof typeof categoryConfig> = [
  "MINUTES",
  "REGULATION",
  "OTHER",
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default async function ArhivaPage({
  searchParams,
}: {
  searchParams: Promise<{ kategorija?: string }>
}) {
  const session = await auth()
  if (!session) return null
  const isManager = session.user.role === "MANAGER"
  const { kategorija } = await searchParams

  const visibleCategories = isManager ? categoryOrder : RESIDENT_VISIBLE
  const requestedCategory =
    kategorija && (visibleCategories as string[]).includes(kategorija)
      ? (kategorija as keyof typeof categoryConfig)
      : undefined

  const documents = await db.archiveDocument.findMany({
    where: requestedCategory
      ? { category: requestedCategory }
      : { category: { in: visibleCategories } },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Digitalna arhiva</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zapisnici, ugovori, racuni i ostali dokumenti
          </p>
        </div>
        {isManager && (
          <Button render={<Link href="/dashboard/arhiva/novi" />}>
            <Plus className="w-4 h-4 mr-2" />
            Novi dokument
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/dashboard/arhiva"
          className={`px-3 py-1 rounded-full text-xs border ${
            !kategorija
              ? "bg-slate-900 text-white border-slate-900"
              : "hover:bg-accent"
          }`}
        >
          Sve
        </Link>
        {visibleCategories.map((cat) => {
          const cfg = categoryConfig[cat]
          const active = kategorija === cat
          return (
            <Link
              key={cat}
              href={`/dashboard/arhiva?kategorija=${cat}`}
              className={`px-3 py-1 rounded-full text-xs border ${
                active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "hover:bg-accent"
              }`}
            >
              {cfg.label}
            </Link>
          )
        })}
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {kategorija ? "Nema dokumenata u ovoj kategoriji" : "Arhiva je prazna"}
            </p>
            {isManager && !kategorija && (
              <Button
                className="mt-4"
                variant="outline"
                render={<Link href="/dashboard/arhiva/novi" />}
              >
                Otpremi prvi dokument
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {documents.length} dokument{documents.length === 1 ? "" : "a"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc) => {
                const cfg = categoryConfig[doc.category]
                const Icon = cfg.icon
                return (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {cfg.label}
                        </Badge>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {doc.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.fileName} · {formatSize(doc.fileSize)} · {doc.year} ·{" "}
                        {doc.uploadedBy.name} ·{" "}
                        {new Date(doc.createdAt).toLocaleDateString("sr-RS")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={
                          <a
                            href={`/api/arhiva/${doc.id}/download`}
                            download={doc.fileName}
                          />
                        }
                        title="Preuzmi"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {isManager && (
                        <ConfirmDelete
                          action={deleteDocument.bind(null, doc.id)}
                          label=""
                          confirmLabel="Obrisi?"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
