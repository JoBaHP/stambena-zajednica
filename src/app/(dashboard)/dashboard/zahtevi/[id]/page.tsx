import { auth } from "@/auth"
import { db } from "@/lib/db"
import { readTriage } from "@/lib/ai-triage"
import {
  requestCategoryLabels,
  requestPriorityLabels,
  label as enumLabel,
} from "@/lib/labels"
import { notFound, redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { SubmitButton } from "@/components/submit-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, AlertTriangle, MessageSquare, Sparkles } from "lucide-react"
import Link from "next/link"
import {
  addComment,
  updateRequestStatus,
  deleteRequest,
  applyTriage,
} from "@/server/actions/zahtevi"
import { ConfirmDelete } from "@/components/confirm-delete"

const categoryLabels: Record<string, string> = {
  PLUMBING: "Vodovod",
  ELECTRICAL: "Elektrika",
  ELEVATOR: "Lift",
  HEATING: "Grejanje",
  CLEANING: "Ciscenje",
  STRUCTURAL: "Gradjevinski",
  OTHER: "Ostalo",
}

const statusLabels: Record<string, string> = {
  SUBMITTED: "Prijavljeno",
  IN_PROGRESS: "U toku",
  RESOLVED: "Reseno",
  REJECTED: "Odbijeno",
}

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  RESOLVED: "bg-green-100 text-green-800",
  REJECTED: "bg-slate-100 text-slate-700",
}

const priorityLabels: Record<string, string> = {
  LOW: "Nizak",
  NORMAL: "Normalan",
  HIGH: "Visok",
  URGENT: "Hitno",
}

export default async function ZahtevDetaljiPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  const isManager = session.user.role === "MANAGER"

  const request = await db.maintenanceRequest.findUnique({
    where: { id },
    include: {
      reporter: { select: { name: true, unit: true } },
      photos: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
  })

  if (!request) notFound()

  const triage = isManager ? readTriage(request.aiTriage) : null

  const isReporter = request.reporterId === session.user.id
  if (!isManager && !isReporter) redirect("/dashboard/zahtevi")

  const canDelete = isManager || isReporter

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/zahtevi"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Svi zahtevi
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {request.priority === "URGENT" && (
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              )}
              <h1 className="text-2xl font-semibold">{request.title}</h1>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-xs ${statusStyles[request.status]}`}
              >
                {statusLabels[request.status]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {categoryLabels[request.category]}
              </Badge>
              {request.priority === "URGENT" && (
                <Badge variant="destructive" className="text-xs">
                  {priorityLabels[request.priority]}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <p className="whitespace-pre-wrap">{request.description}</p>

          {request.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {request.photos.map((photo, i) => (
                <a
                  key={photo.id}
                  href={`/api/zahtevi/${photo.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  title={`Otvori fotografiju ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/zahtevi/${photo.id}/download`}
                    alt={`Fotografija ${i + 1} uz zahtev`}
                    className="w-24 h-24 object-cover rounded-lg border hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t">
            <p>
              Prijavio: {request.reporter.name}
              {request.reporter.unit && ` (stan ${request.reporter.unit})`}
            </p>
            {request.location && <p>Lokacija: {request.location}</p>}
            <p>
              Prijavljeno:{" "}
              {new Date(request.createdAt).toLocaleString("sr-RS", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            {request.resolvedAt && (
              <p>
                Reseno:{" "}
                {new Date(request.resolvedAt).toLocaleString("sr-RS", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
          {request.resolution && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Resenje
              </p>
              <p className="text-sm whitespace-pre-wrap">{request.resolution}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {triage && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Predlog razvrstavanja
            </CardTitle>
            <p className="text-xs text-muted-foreground pt-1">
              Predlog na osnovu opisa. Odluka je vasa — zapis se ne menja dok ga
              ne prihvatite.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {triage.category && (
                <span className="px-2 py-1 rounded-md bg-muted">
                  Kategorija: {enumLabel(requestCategoryLabels, triage.category)}
                </span>
              )}
              {triage.priority && (
                <span className="px-2 py-1 rounded-md bg-muted">
                  Prioritet: {enumLabel(requestPriorityLabels, triage.priority)}
                </span>
              )}
              {triage.contractor && (
                <span className="px-2 py-1 rounded-md bg-muted">
                  Izvodjac: {triage.contractor}
                </span>
              )}
            </div>

            {triage.reason && (
              <p className="text-sm text-muted-foreground">{triage.reason}</p>
            )}

            {(triage.category || triage.priority) &&
              (triage.category !== request.category ||
                triage.priority !== request.priority) && (
                <form action={applyTriage.bind(null, request.id)}>
                  <SubmitButton size="sm" variant="outline">
                    Prihvati kategoriju i prioritet
                  </SubmitButton>
                </form>
              )}
          </CardContent>
        </Card>
      )}

      {isManager && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Azuriraj status</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={updateRequestStatus.bind(null, request.id)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={request.status}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="SUBMITTED">Prijavljeno</option>
                  <option value="IN_PROGRESS">U toku</option>
                  <option value="RESOLVED">Reseno</option>
                  <option value="REJECTED">Odbijeno</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution">Resenje / komentar (opciono)</Label>
                <Textarea
                  id="resolution"
                  name="resolution"
                  defaultValue={request.resolution ?? ""}
                  rows={3}
                  placeholder="Opis resenja ili razlog odbijanja"
                />
              </div>
              <SubmitButton>Sacuvaj</SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Komentari ({request.comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Jos uvek nema komentara</p>
          ) : (
            <div className="space-y-3">
              {request.comments.map((c) => (
                <div key={c.id} className="border-l-2 border-slate-200 pl-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {c.author.name}
                    </span>
                    {c.author.role === "MANAGER" && (
                      <Badge variant="outline" className="text-xs">
                        Upravnik
                      </Badge>
                    )}
                    <span>
                      {new Date(c.createdAt).toLocaleString("sr-RS", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap mt-1">{c.body}</p>
                </div>
              ))}
            </div>
          )}

          <form
            action={addComment.bind(null, request.id)}
            className="space-y-3 pt-3 border-t"
          >
            <Label htmlFor="body">Dodaj komentar</Label>
            <Textarea
              id="body"
              name="body"
              rows={3}
              placeholder="Napisi komentar..."
              required
            />
            <SubmitButton size="sm">
              Posalji
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {canDelete && (
        <div className="flex justify-end">
          <ConfirmDelete
            action={deleteRequest.bind(null, request.id)}
            label="Obrisi zahtev"
          />
        </div>
      )}
    </div>
  )
}
