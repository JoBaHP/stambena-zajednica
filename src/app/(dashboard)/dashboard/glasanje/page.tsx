import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Vote, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"

export default async function GlasanjePage() {
  const session = await auth()
  const isManager = session?.user.role === "MANAGER"
  const now = new Date()

  const polls = await db.poll.findMany({
    where: isManager ? {} : { status: { in: ["ACTIVE", "CLOSED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      options: { include: { votes: true } },
      _count: { select: { votes: true } },
    },
  })

  const activePolls = polls.filter((p) => p.status === "ACTIVE")
  const closedPolls = polls.filter((p) => p.status === "CLOSED")
  const draftPolls = polls.filter((p) => p.status === "DRAFT")

  function PollCard({ poll }: { poll: (typeof polls)[0] }) {
    const totalVotes = poll._count.votes
    return (
      <Link href={`/dashboard/glasanje/${poll.id}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{poll.title}</CardTitle>
              <Badge
                variant={
                  poll.status === "ACTIVE"
                    ? "default"
                    : poll.status === "CLOSED"
                    ? "secondary"
                    : "outline"
                }
                className="shrink-0 text-xs"
              >
                {poll.status === "ACTIVE" ? "Aktivno" : poll.status === "CLOSED" ? "Zatvoreno" : "Nacrt"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {poll.description && (
              <p className="text-sm text-muted-foreground mb-3">{poll.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Vote className="w-3.5 h-3.5" />
                {totalVotes} glasova
              </span>
              {poll.endsAt && poll.status === "ACTIVE" && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Istice: {new Date(poll.endsAt).toLocaleDateString("sr-RS")}
                </span>
              )}
              {poll.status === "CLOSED" && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Odluka donesena
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Glasanje</h1>
          <p className="text-sm text-muted-foreground mt-1">Odluke skupstine stambene zajednice</p>
        </div>
        {isManager && (
          <Button render={<Link href="/dashboard/glasanje/novo" />}>
            <Plus className="w-4 h-4 mr-2" />
            Novo glasanje
          </Button>
        )}
      </div>

      {polls.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Nema glasanja</p>
            {isManager && (
              <Button
                className="mt-4"
                variant="outline"
                render={<Link href="/dashboard/glasanje/novo" />}
              >
                Kreiraj prvo glasanje
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activePolls.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Aktivna glasanja</h2>
              <div className="space-y-3">
                {activePolls.map((p) => <PollCard key={p.id} poll={p} />)}
              </div>
            </section>
          )}

          {isManager && draftPolls.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Nacrti</h2>
              <div className="space-y-3">
                {draftPolls.map((p) => <PollCard key={p.id} poll={p} />)}
              </div>
            </section>
          )}

          {closedPolls.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Arhiva odluka</h2>
              <div className="space-y-3">
                {closedPolls.map((p) => <PollCard key={p.id} poll={p} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
