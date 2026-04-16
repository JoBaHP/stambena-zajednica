import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ShieldCheck, ShieldX, ShieldAlert, Calendar } from "lucide-react"
import Link from "next/link"

const resultConfig = {
  PASSED: { label: "Proslo", icon: ShieldCheck, color: "text-green-600", badge: "default" as const },
  FAILED: { label: "Nije proslo", icon: ShieldX, color: "text-red-600", badge: "destructive" as const },
  CONDITIONAL: { label: "Uslovno", icon: ShieldAlert, color: "text-amber-600", badge: "secondary" as const },
}

export default async function InspekcijaPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const inspections = await db.pPInspection.findMany({
    orderBy: { inspectionDate: "desc" },
    include: { documents: true },
  })

  const upcoming = inspections.filter(
    (i) => i.nextDueDate && i.nextDueDate <= in30Days && i.nextDueDate >= now
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">PP Inspekcije</h1>
          <p className="text-sm text-muted-foreground mt-1">Evidencija protivpozarnih inspekcija</p>
        </div>
        <Button render={<Link href="/dashboard/inspekcije/nova" />}>
          <Plus className="w-4 h-4 mr-2" />
          Nova inspekcija
        </Button>
      </div>

      {upcoming.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-700">Predstojeci rokovi (30 dana)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcoming.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-amber-700">
                    {new Date(i.nextDueDate!).toLocaleDateString("sr-RS")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {inspections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Nema evidentiranih inspekcija</p>
            <Button
              className="mt-4"
              variant="outline"
              render={<Link href="/dashboard/inspekcije/nova" />}
            >
              Dodaj prvu inspekciju
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {inspections.map((i) => {
            const config = resultConfig[i.result]
            const Icon = config.icon
            return (
              <Link key={i.id} href={`/dashboard/inspekcije/${i.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
                        <div>
                          <p className="font-medium text-sm">{i.title}</p>
                          {i.inspector && (
                            <p className="text-xs text-muted-foreground mt-0.5">{i.inspector}</p>
                          )}
                          {i.notes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{i.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={config.badge} className="text-xs mb-1">
                          {config.label}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(i.inspectionDate).toLocaleDateString("sr-RS")}
                        </div>
                        {i.nextDueDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Sledeca: {new Date(i.nextDueDate).toLocaleDateString("sr-RS")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
