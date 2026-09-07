import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Camera, MessageSquare, Plus, Wrench } from "lucide-react"
import Link from "next/link"
import { moduleAccent } from "@/lib/modules"
import {
  requestCategoryLabels,
  requestPriorityLabels,
  requestStatusLabels,
  label as enumLabel,
} from "@/lib/labels"

// Boja statusa: tackica u redu, pozadina znacke i traka na levoj ivici reda.
const statusStyle: Record<string, { dot: string; chip: string }> = {
  SUBMITTED: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-800" },
  IN_PROGRESS: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800" },
  RESOLVED: { dot: "bg-green-500", chip: "bg-green-50 text-green-800" },
  REJECTED: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700" },
}

const OPEN = ["SUBMITTED", "IN_PROGRESS"]

export default async function ZahteviPage() {
  const session = await auth()
  if (!session) return null
  const isManager = session.user.role === "MANAGER"

  const requests = await db.maintenanceRequest.findMany({
    where: isManager ? {} : { reporterId: session.user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { select: { name: true, unit: true } },
      _count: { select: { comments: true, photos: true } },
    },
  })

  const counts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})
  const openCount = requests.filter((r) => OPEN.includes(r.status)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: moduleAccent.zahtevi.tint }}
          >
            <Wrench className="w-5 h-5" style={{ color: moduleAccent.zahtevi.color }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Захтеви за интервенције
            </h1>
            <p className="text-sm text-muted-foreground">
              {isManager
                ? `${openCount} ${openCount === 1 ? "отворен" : "отворених"} · ${requests.length} укупно`
                : "Ваши пријављени захтеви"}
            </p>
          </div>
        </div>
        <Button render={<Link href="/dashboard/zahtevi/novi" />}>
          <Plus className="w-4 h-4 mr-2" />
          Пријави квар
        </Button>
      </div>

      {requests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center h-8 px-3.5 rounded-full bg-foreground text-background text-sm font-semibold">
            Sve ({requests.length})
          </span>
          {(["SUBMITTED", "IN_PROGRESS", "RESOLVED", "REJECTED"] as const)
            .filter((s) => counts[s])
            .map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full border bg-card text-sm"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle[s].dot}`} />
                {enumLabel(requestStatusLabels, s)} ({counts[s]})
              </span>
            ))}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12 flex flex-col items-center gap-4 text-center">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: moduleAccent.zahtevi.tint }}
          >
            <Wrench className="w-7 h-7" style={{ color: moduleAccent.zahtevi.color }} />
          </span>
          <div>
            <p className="text-lg font-bold">Нема отворених захтева</p>
            <p className="text-sm text-muted-foreground max-w-md mt-1 text-pretty">
              Ако приметите квар у згради — цурење, лифт, расвета — пријавите га овде. Можете додати и фотографију, управник одмах добија обавештење.
            </p>
          </div>
          <Button render={<Link href="/dashboard/zahtevi/novi" />}>
            <Camera className="w-4 h-4 mr-2" />
            Пријави квар
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden divide-y">
          {requests.map((r) => {
            const style = statusStyle[r.status] ?? statusStyle.REJECTED
            const isUrgent = r.priority === "URGENT" && OPEN.includes(r.status)

            return (
              <Link
                key={r.id}
                href={`/dashboard/zahtevi/${r.id}`}
                className="flex items-center gap-4 pr-4 sm:pr-5 hover:bg-muted/40 transition-colors"
              >
                <span className={`w-1 self-stretch my-3 rounded-r-full ${style.dot}`} />

                <span className="min-w-0 flex-1 py-3.5">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-semibold">{r.title}</span>
                    {r._count.photos > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded-md px-1.5">
                        <Camera className="w-3 h-3" />
                        {r._count.photos}
                      </span>
                    )}
                    {r._count.comments > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded-md px-1.5">
                        <MessageSquare className="w-3 h-3" />
                        {r._count.comments}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                    {enumLabel(requestCategoryLabels, r.category)}
                    {r.location && ` · ${r.location}`}
                    {isManager &&
                      ` · ${r.reporter.name}${r.reporter.unit ? `, stan ${r.reporter.unit}` : ""}`}
                  </span>
                </span>

                <span
                  className={`hidden sm:inline-flex shrink-0 items-center text-xs font-semibold px-2.5 py-1 rounded-md ${style.chip}`}
                >
                  {enumLabel(requestStatusLabels, r.status)}
                </span>

                <span
                  className={`hidden md:block shrink-0 w-20 text-sm ${
                    isUrgent ? "text-red-700 font-bold" : "text-muted-foreground"
                  }`}
                >
                  {enumLabel(requestPriorityLabels, r.priority)}
                </span>

                <span className="shrink-0 text-sm text-muted-foreground nums text-right w-16">
                  {new Date(r.createdAt).toLocaleDateString("sr-Cyrl-RS", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
