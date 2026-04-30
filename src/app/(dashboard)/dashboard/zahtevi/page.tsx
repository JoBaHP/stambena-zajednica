import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, AlertTriangle, MessageSquare } from "lucide-react"
import Link from "next/link"

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

export default async function ZahteviPage() {
  const session = await auth()
  if (!session) return null
  const isManager = session.user.role === "MANAGER"

  const requests = await db.maintenanceRequest.findMany({
    where: isManager ? {} : { reporterId: session.user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { select: { name: true, unit: true } },
      _count: { select: { comments: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zahtevi za intervencije</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isManager ? "Svi zahtevi stanara" : "Vasi prijavljeni zahtevi"}
          </p>
        </div>
        <Button render={<Link href="/dashboard/zahtevi/novi" />}>
          <Plus className="w-4 h-4 mr-2" />
          Novi zahtev
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Nema zahteva</p>
            <Button
              className="mt-4"
              variant="outline"
              render={<Link href="/dashboard/zahtevi/novi" />}
            >
              Prijavi prvi zahtev
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/zahtevi/${r.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.priority === "URGENT" && (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <h3 className="font-medium truncate">{r.title}</h3>
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusStyles[r.status]}`}
                        >
                          {statusLabels[r.status]}
                        </Badge>
                        {r.priority === "URGENT" && (
                          <Badge variant="destructive" className="text-xs">
                            {priorityLabels[r.priority]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {r.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span>{categoryLabels[r.category]}</span>
                        {r.location && <span>· {r.location}</span>}
                        {isManager && (
                          <span>
                            · {r.reporter.name}
                            {r.reporter.unit && ` (stan ${r.reporter.unit})`}
                          </span>
                        )}
                        <span>· {new Date(r.createdAt).toLocaleDateString("sr-RS")}</span>
                        {r._count.comments > 0 && (
                          <span className="flex items-center gap-1">
                            · <MessageSquare className="w-3 h-3" />
                            {r._count.comments}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
