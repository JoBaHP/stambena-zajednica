import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, AlertTriangle, MessageSquare } from "lucide-react"
import Link from "next/link"
import {
  addComment,
  updateRequestStatus,
  deleteRequest,
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
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
  })

  if (!request) notFound()

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
              <Button type="submit">Sacuvaj</Button>
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
            <Button type="submit" size="sm">
              Posalji
            </Button>
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
