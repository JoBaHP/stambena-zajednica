import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, Pencil, Activity, Clock } from "lucide-react"
import Link from "next/link"

function formatLastSeen(date: Date | null): string {
  if (!date) return "Nikad"
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Upravo sada"
  if (minutes < 60) return `Pre ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Pre ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Pre ${days} d`
  return date.toLocaleDateString("sr-RS")
}

export default async function StanariPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60_000)

  const [users, activeCount] = await Promise.all([
    db.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    db.user.count({
      where: { lastSeenAt: { gte: fifteenMinutesAgo }, active: true },
    }),
  ])

  const managers = users.filter((u) => u.role === "MANAGER")
  const stanari = users.filter(
    (u) => u.role === "RESIDENT" || (u.role === "MANAGER" && u.unit),
  )

  const renderRow = (u: (typeof users)[number]) => (
    <Link
      key={u.id}
      href={`/dashboard/stanari/${u.id}`}
      className={`flex items-center justify-between p-3 rounded-lg hover:bg-accent group ${
        u.active ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              u.role === "MANAGER" ? "bg-slate-900" : "bg-slate-100"
            }`}
          >
            <User
              className={`w-4 h-4 ${u.role === "MANAGER" ? "text-white" : "text-slate-500"}`}
            />
          </div>
          {u.lastSeenAt && u.lastSeenAt >= fifteenMinutesAgo && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{u.name}</p>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!u.active && (
          <Badge variant="destructive" className="text-xs">
            Pristup uklonjen
          </Badge>
        )}
        {u.unit && (
          <Badge variant="outline" className="text-xs">
            Stan {u.unit}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatLastSeen(u.lastLoginAt)}
        </span>
        <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
      </div>
    </Link>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stanari</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Korisnici aplikacije
          </p>
        </div>
        <Button render={<Link href="/dashboard/stanari/novi" />}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj stanara
        </Button>
      </div>

      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-900">
              {activeCount}{" "}
              {activeCount === 1 ? "korisnik aktivan" : activeCount >= 2 && activeCount <= 4 ? "korisnika aktivna" : "korisnika aktivno"}{" "}
              sada
            </p>
            <p className="text-xs text-green-700">
              Aktivnost u poslednjih 15 minuta · {users.filter((u) => u.active).length} ukupno aktivnih naloga
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stanari ({stanari.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {stanari.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nema registrovanih stanara
            </p>
          ) : (
            <div className="space-y-2">{stanari.map(renderRow)}</div>
          )}
        </CardContent>
      </Card>

      {managers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Upravnici ({managers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">{managers.map(renderRow)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
