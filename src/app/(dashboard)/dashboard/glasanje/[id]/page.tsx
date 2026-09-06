import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { castVote, closePoll, activatePoll } from "@/server/actions/glasanje"
import Link from "next/link"
import { ExportPollResultsButton } from "./export-button"
import { tallyPoll, formatArea } from "@/lib/glasanje"

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

  const tally = await tallyPoll(poll.id, poll.options, poll.requiredShare)

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
            const result = tally.options.find((o) => o.id === option.id)
            const voteCount = option._count.votes
            // Kad su kvadrature unete, traka prikazuje udeo u ukupnoj kvadraturi
            // zgrade — to je velicina od koje zavisi da li je odluka doneta.
            const percentage = tally.weighted
              ? (result?.sharePct ?? 0)
              : totalVotes > 0
                ? (voteCount / totalVotes) * 100
                : 0
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
                  <span className="text-muted-foreground tabular-nums">
                    {tally.weighted
                      ? `${percentage.toFixed(1)}% udela · ${voteCount} ${voteCount === 1 ? "glas" : "glasova"}`
                      : `${voteCount} (${percentage.toFixed(0)}%)`}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isUserChoice ? "bg-primary" : "bg-slate-400"
                    }`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
                {result?.passes && (
                  <p className="text-xs text-green-700">
                    Presla prag od {tally.requiredShare}% — odluka je doneta
                  </p>
                )}
              </div>
            )
          })}

          {tally.weighted ? (
            <div className="pt-3 border-t space-y-1 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  Kvorum: {tally.quorumPct.toFixed(1)}%
                </span>{" "}
                ({formatArea(tally.votedArea)} od {formatArea(tally.totalArea)}) ·{" "}
                {tally.quorumMet ? "kvorum je ispunjen" : "potrebno je preko 50%"}
              </p>
              <p>
                Glasalo {totalVotes} od {tally.ownersTotal} vlasnika · prag za
                odluku {tally.requiredShare}% ukupnog udela
                {poll.endsAt &&
                  ` · Istice: ${new Date(poll.endsAt).toLocaleDateString("sr-RS")}`}
              </p>
            </div>
          ) : (
            <div className="pt-3 border-t space-y-1 text-xs text-muted-foreground">
              <p>
                Ukupno glasova: {totalVotes}
                {poll.endsAt &&
                  ` · Istice: ${new Date(poll.endsAt).toLocaleDateString("sr-RS")}`}
              </p>
              {isManager && tally.ownersMissingArea > 0 && (
                <p className="text-amber-700">
                  Racuna se broj glasova, ne vlasnicki udeo — {tally.ownersMissingArea}{" "}
                  {tally.ownersMissingArea === 1 ? "stan nema" : "stanova nema"} unetu
                  kvadraturu.{" "}
                  <Link href="/dashboard/stanari" className="underline">
                    Unesi kvadrature
                  </Link>{" "}
                  da bi se odluka racunala po udelu.
                </p>
              )}
            </div>
          )}
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
        {isManager && poll.status !== "DRAFT" && (
          <ExportPollResultsButton pollId={poll.id} />
        )}
      </div>
    </div>
  )
}
