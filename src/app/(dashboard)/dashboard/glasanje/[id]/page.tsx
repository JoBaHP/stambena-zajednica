import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { castVote, closePoll, activatePoll } from "@/server/actions/glasanje"
import Link from "next/link"

export default async function GlasanjeDetaljPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params
  const isManager = session?.user.role === "MANAGER"

  const poll = await db.poll.findUnique({
    where: { id },
    include: {
      options: {
        include: { _count: { select: { votes: true } } },
      },
      _count: { select: { votes: true } },
    },
  })

  if (!poll) notFound()

  const userVote = session
    ? await db.vote.findUnique({
        where: { pollId_voterId: { pollId: id, voterId: session.user.id } },
      })
    : null

  const totalVotes = poll._count.votes
  const hasVoted = !!userVote
  const canVote = poll.status === "ACTIVE" && !hasVoted
  const showResults = hasVoted || poll.status === "CLOSED" || isManager

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{poll.title}</h1>
          {poll.description && (
            <p className="text-sm text-muted-foreground mt-1">{poll.description}</p>
          )}
        </div>
        <Badge
          variant={
            poll.status === "ACTIVE" ? "default" : poll.status === "CLOSED" ? "secondary" : "outline"
          }
        >
          {poll.status === "ACTIVE" ? "Aktivno" : poll.status === "CLOSED" ? "Zatvoreno" : "Nacrt"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {canVote ? "Izaberite opciju" : showResults ? "Rezultati" : "Glasanje nije aktivno"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {poll.options.map((option) => {
            const voteCount = option._count.votes
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
            const isUserChoice = userVote?.optionId === option.id

            if (canVote) {
              return (
                <form key={option.id} action={castVote.bind(null, poll.id, option.id)}>
                  <button
                    type="submit"
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:border-primary transition-colors"
                  >
                    <span className="text-sm font-medium">{option.text}</span>
                  </button>
                </form>
              )
            }

            return (
              <div key={option.id} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${isUserChoice ? "text-primary" : ""}`}>
                    {option.text} {isUserChoice && "(vas glas)"}
                  </span>
                  <span className="text-muted-foreground">
                    {voteCount} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isUserChoice ? "bg-primary" : "bg-slate-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}

          <p className="text-xs text-muted-foreground pt-2">
            Ukupno glasova: {totalVotes}
            {poll.endsAt && ` · Istice: ${new Date(poll.endsAt).toLocaleDateString("sr-RS")}`}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" render={<Link href="/dashboard/glasanje" />}>
          Nazad
        </Button>
        {isManager && poll.status === "DRAFT" && (
          <form action={activatePoll.bind(null, poll.id)}>
            <Button type="submit">Aktiviraj glasanje</Button>
          </form>
        )}
        {isManager && poll.status === "ACTIVE" && (
          <form action={closePoll.bind(null, poll.id)}>
            <Button type="submit" variant="destructive">Zatvori glasanje</Button>
          </form>
        )}
      </div>
    </div>
  )
}
