import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, User } from "lucide-react"
import Link from "next/link"

export default async function StanariPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const residents = await db.user.findMany({
    orderBy: { name: "asc" },
  })

  const managers = residents.filter((r) => r.role === "MANAGER")
  const stanari = residents.filter((r) => r.role === "RESIDENT")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stanari</h1>
          <p className="text-sm text-muted-foreground mt-1">Korisnici aplikacije</p>
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
            <div className="space-y-2">
              {stanari.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.unit && (
                      <Badge variant="outline" className="text-xs">Stan {r.unit}</Badge>
                    )}
                    {r.phone && (
                      <span className="text-xs text-muted-foreground">{r.phone}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {managers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upravnici ({managers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {managers.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                  </div>
                  <Badge className="text-xs">Upravnik</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
