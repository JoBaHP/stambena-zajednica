import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Gavel,
  Building2,
  FileText,
  Download,
  Trophy,
  Plus,
  RotateCcw,
} from "lucide-react"
import Link from "next/link"
import { VoteButton } from "./vote-button"
import { RegenerateButton } from "./regenerate-button"
import { CompareButton } from "./compare-button"
import { ConfirmDelete } from "@/components/confirm-delete"
import {
  closeTender,
  reopenTender,
  deleteTenderOffer,
} from "@/server/actions/tenderi"

export default async function TenderDetaljPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const tender = await db.tender.findUnique({
    where: { id },
    include: {
      investment: { select: { id: true, title: true } },
      offers: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { votes: true } } },
      },
      votes: { select: { offerId: true, userId: true } },
    },
  })

  if (!tender) notFound()

  const isManager = session.user.role === "MANAGER"
  const myVote = tender.votes.find((v) => v.userId === session.user.id)
  const totalVotes = tender.votes.length

  const sortedOffers = [...tender.offers].sort(
    (a, b) => b._count.votes - a._count.votes,
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link
              href="/dashboard/investicije"
              className="hover:text-foreground transition-colors"
            >
              Investicije
            </Link>
            <span>/</span>
            <Link
              href={`/dashboard/investicije/${tender.investment.id}`}
              className="hover:text-foreground transition-colors"
            >
              {tender.investment.title}
            </Link>
            <span>/</span>
            <span>Tender</span>
          </div>
          <h1 className="text-2xl font-semibold">{tender.title}</h1>
          {tender.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {tender.description}
            </p>
          )}
        </div>
        <Badge variant={tender.status === "OPEN" ? "default" : "secondary"}>
          {tender.status === "OPEN" ? "Aktivno" : "Zatvoreno"}
        </Badge>
      </div>

      {tender.status === "CLOSED" && tender.selectedId && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Izabrana ponuda:{" "}
                {tender.offers.find((o) => o.id === tender.selectedId)?.company}
              </p>
              <p className="text-xs text-amber-700">
                Glasanje zatvoreno{" "}
                {tender.closedAt
                  ? new Date(tender.closedAt).toLocaleDateString("sr-RS")
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {tender.status === "OPEN" && !isManager && (
        <p className="text-sm text-muted-foreground">
          {myVote
            ? `Glasali ste za: ${tender.offers.find((o) => o.id === myVote.offerId)?.company}. Kliknite na drugu ponudu da promenite glas.`
            : "Pregledajte ponude i glasajte za najpovoljniju."}
        </p>
      )}

      <div className="space-y-4">
        {sortedOffers.map((offer, idx) => {
          const isWinner = tender.selectedId === offer.id
          const isMyVoteOffer = myVote?.offerId === offer.id
          const voteCount = offer._count.votes
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

          return (
            <Card
              key={offer.id}
              className={
                isWinner
                  ? "border-amber-300 bg-amber-50/50"
                  : isMyVoteOffer
                    ? "border-primary/40"
                    : ""
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isWinner && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
                    <CardTitle className="text-base">
                      {tender.status === "CLOSED" ? `${idx + 1}. ` : ""}
                      {offer.company}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <VoteButton
                      tenderId={tender.id}
                      offerId={offer.id}
                      isMyVote={isMyVoteOffer}
                      disabled={tender.status !== "OPEN"}
                    />
                    {isManager && (
                      <ConfirmDelete
                        action={deleteTenderOffer.bind(null, offer.id)}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {offer.price !== null && (
                  <p className="text-sm font-semibold text-indigo-700">
                    {Number(offer.price).toLocaleString("sr-RS", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    RSD
                  </p>
                )}

                {offer.description && (
                  <p className="text-sm text-muted-foreground">
                    {offer.description}
                  </p>
                )}

                {offer.aiSummary ? (
                  <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2">
                    <p className="text-[11px] font-medium text-indigo-700 mb-1">
                      AI sažetak
                    </p>
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      {offer.aiSummary}
                    </p>
                  </div>
                ) : (
                  isManager && offer.fileId && (
                    <RegenerateButton offerId={offer.id} />
                  )
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {voteCount}{" "}
                      {voteCount === 1 ? "glas" : "glasova"} ({pct}%)
                    </p>
                  </div>

                  {offer.fileId && (
                    <a
                      href={`/api/tenderi/${offer.id}/download`}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {offer.fileName ?? "Preuzmi"}
                      <Download className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {tender.offers.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nema ponuda. Dodajte prvu ponudu.</p>
          </CardContent>
        </Card>
      )}

      {/* AI поређење понуда */}
      {(tender.aiComparison || (isManager && tender.offers.length >= 2)) && (
        <Card className="border-indigo-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-indigo-600">✦</span>
                AI поређење понуда
              </CardTitle>
              {isManager && (
                <CompareButton
                  tenderId={tender.id}
                  hasComparison={!!tender.aiComparison}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tender.aiComparison ? (
              <>
                <div className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                  {tender.aiComparison}
                </div>
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 flex gap-2">
                  <span className="text-amber-600 shrink-0 mt-0.5">⚠</span>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Препорука је генерисана на основу доступних информација у систему и не значи да AI располаже свим подацима везаним за понуду. Коначну одлуку доноси управник уз увид у потпуну документацију.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Кликните на „AI поређење понуда" да генеришете анализу свих понуда.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isManager && (
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Upravljanje tenderom
          </p>

          {tender.status === "OPEN" && (
            <div className="space-y-3">
              <Button
                variant="outline"
                render={
                  <Link href={`/dashboard/tenderi/${tender.id}/nova-ponuda`} />
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj ponudu
              </Button>

              {tender.offers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Zatvori glasanje i proglasi pobednika:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tender.offers.map((offer) => (
                      <form key={offer.id} action={closeTender.bind(null, tender.id, offer.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          <Trophy className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                          {offer.company}
                        </Button>
                      </form>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tender.status === "CLOSED" && (
            <form action={reopenTender.bind(null, tender.id)}>
              <Button type="submit" variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Ponovo otvori glasanje
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
