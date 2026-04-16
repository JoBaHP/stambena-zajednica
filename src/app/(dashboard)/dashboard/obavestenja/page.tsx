import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pin, Plus, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default async function ObavestenjaPage() {
  const session = await auth()
  const isManager = session?.user.role === "MANAGER"
  const now = new Date()

  const announcements = await db.announcement.findMany({
    where: {
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    include: { author: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Obavestenja</h1>
          <p className="text-sm text-muted-foreground mt-1">Oglasna tabla stambene zajednice</p>
        </div>
        {isManager && (
          <Button render={<Link href="/dashboard/obavestenja/novo" />}>
            <Plus className="w-4 h-4 mr-2" />
            Novo obavestenje
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Nema obavestenja</p>
            {isManager && (
              <Button
                className="mt-4"
                variant="outline"
                render={<Link href="/dashboard/obavestenja/novo" />}
              >
                Dodaj prvo obavestenje
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card
              key={a.id}
              className={a.priority === "URGENT" ? "border-red-200 bg-red-50/50" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.isPinned && <Pin className="w-4 h-4 text-slate-500 shrink-0" />}
                    {a.priority === "URGENT" && (
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    {a.priority === "URGENT" && (
                      <Badge variant="destructive" className="text-xs">Hitno</Badge>
                    )}
                  </div>
                  {isManager && (
                    <Link
                      href={`/dashboard/obavestenja/${a.id}/uredi`}
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Uredi
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  {a.author.name} · {new Date(a.publishedAt).toLocaleDateString("sr-RS")}
                  {a.expiresAt && ` · Istice: ${new Date(a.expiresAt).toLocaleDateString("sr-RS")}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
