import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AlertTriangle, Mail, Phone, Home, Inbox } from "lucide-react"
import { AccessRequestActions } from "./access-request-actions"

function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  let out = ""
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export default async function ZahteviZaPristupPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const requests = await db.accessRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  })

  const pending = requests.filter((r) => r.status === "PENDING")
  const processed = requests.filter((r) => r.status !== "PENDING")

  const unitsToCheck = Array.from(
    new Set(pending.map((r) => r.unit).filter((u): u is string => !!u)),
  )
  const occupants =
    unitsToCheck.length > 0
      ? await db.user.findMany({
          where: { unit: { in: unitsToCheck }, active: true },
          select: { name: true, email: true, unit: true },
        })
      : []
  const occupantByUnit = new Map(
    occupants.map((u) => [u.unit ?? "", u]),
  )

  const reviewerIds = Array.from(
    new Set(processed.map((r) => r.reviewedById).filter((x): x is string => !!x)),
  )
  const reviewers =
    reviewerIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: reviewerIds } },
          select: { id: true, name: true },
        })
      : []
  const reviewerById = new Map(reviewers.map((r) => [r.id, r.name]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Zahtevi za pristup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pregled novih zahteva za pristup portalu
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Na cekanju ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-8">
              <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nema zahteva na cekanju
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((r) => {
                const occupant = r.unit
                  ? occupantByUnit.get(r.unit)
                  : undefined
                return (
                  <div key={r.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Mail className="w-3.5 h-3.5" />
                          {r.email}
                        </p>
                        {r.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3.5 h-3.5" />
                            {r.phone}
                          </p>
                        )}
                        {r.unit && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Home className="w-3.5 h-3.5" />
                            Stan {r.unit}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(r.createdAt).toLocaleString("sr-RS")}
                      </span>
                    </div>

                    {r.message && (
                      <div className="mt-3 text-sm bg-slate-50 rounded p-3 border">
                        {r.message}
                      </div>
                    )}

                    {occupant && (
                      <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          Stan <strong>{r.unit}</strong> vec ima aktivnog
                          korisnika: <strong>{occupant.name}</strong> (
                          {occupant.email}). Proveri vlasnistvo pre odobrenja.
                          Ako se vlasnik promenio, ukloni pristup starom
                          korisniku pre odobrenja novog.
                        </div>
                      </div>
                    )}

                    <AccessRequestActions
                      id={r.id}
                      defaultPassword={generatePassword()}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {processed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Istorija</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processed.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{r.name}</p>
                      <Badge
                        variant={
                          r.status === "APPROVED" ? "default" : "destructive"
                        }
                        className="text-xs"
                      >
                        {r.status === "APPROVED" ? "Odobren" : "Odbijen"}
                      </Badge>
                      {r.unit && (
                        <Badge variant="outline" className="text-xs">
                          Stan {r.unit}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.email} ·{" "}
                      {r.reviewedAt
                        ? new Date(r.reviewedAt).toLocaleDateString("sr-RS")
                        : ""}
                      {r.reviewedById && reviewerById.get(r.reviewedById)
                        ? ` · ${reviewerById.get(r.reviewedById)}`
                        : ""}
                    </p>
                    {r.reviewNote && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Razlog: {r.reviewNote}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
