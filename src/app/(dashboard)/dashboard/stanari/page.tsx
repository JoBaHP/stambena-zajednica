import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User, Pencil } from "lucide-react"
import Link from "next/link"

export default async function StanariPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  })

  const managers = users.filter((u) => u.role === "MANAGER")
  const stanari = users.filter((u) => u.role === "RESIDENT")

  const renderRow = (u: (typeof users)[number]) => (
    <Link
      key={u.id}
      href={`/dashboard/stanari/${u.id}`}
      className={`flex items-center justify-between p-3 rounded-lg hover:bg-accent group ${
        u.active ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            u.role === "MANAGER" ? "bg-slate-900" : "bg-slate-100"
          }`}
        >
          <User
            className={`w-4 h-4 ${u.role === "MANAGER" ? "text-white" : "text-slate-500"}`}
          />
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
        {u.phone && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {u.phone}
          </span>
        )}
        <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
      </div>
    </Link>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Stanari ({stanari.length})
          </CardTitle>
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
