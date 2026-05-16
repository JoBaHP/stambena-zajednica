import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Gavel, ChevronRight, Users, FileText } from "lucide-react"
import Link from "next/link"

export default async function TenderiPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const tenders = await db.tender.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      investment: { select: { title: true } },
      _count: { select: { offers: true, votes: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenderi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ponude kompanija za investicione radove — glasajte za najpovoljniju ponudu.
        </p>
      </div>

      {tenders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gavel className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nema aktivnih tendera.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {tenders.map((t) => (
          <Link key={t.id} href={`/dashboard/tenderi/${t.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 shrink-0">
                  <Gavel className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{t.title}</span>
                    <Badge variant={t.status === "OPEN" ? "default" : "secondary"} className="shrink-0">
                      {t.status === "OPEN" ? "Aktivno" : "Zatvoreno"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {t.investment.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {t._count.offers} {t._count.offers === 1 ? "ponuda" : "ponude"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {t._count.votes} {t._count.votes === 1 ? "glas" : "glasova"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {session.user.role === "MANAGER" && (
        <p className="text-xs text-muted-foreground">
          Tenderima se upravlja iz sekcije{" "}
          <Button variant="link" className="p-0 h-auto text-xs" render={<Link href="/dashboard/investicije" />}>
            Investicije
          </Button>
          .
        </p>
      )}
    </div>
  )
}
