import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import {
  Building2,
  Trophy,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { OfferCard } from "./offer-card"
import { CompareButton } from "./compare-button"
import { ComparisonTable } from "./comparison-table"
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
    <div className="max-w-5xl space-y-6">
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

      {/* AI поређење понуда — на врху */}
      {(tender.aiComparison || (isManager && tender.offers.length >= 2)) && (
        <Card className="border-indigo-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
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
              <ComparisonTable content={tender.aiComparison} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Кликните на „AI поређење понуда" да генеришете анализу свих понуда.
              </p>
            )}
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

      {tender.offers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nema ponuda. Dodajte prvu ponudu.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedOffers.map((offer, idx) => (
            <OfferCard
              key={offer.id}
              offer={{
                id: offer.id,
                company: offer.company,
                price: offer.price !== null ? Number(offer.price) : null,
                description: offer.description,
                aiSummary: offer.aiSummary,
                fileId: offer.fileId,
                fileName: offer.fileName,
                _count: offer._count,
              }}
              tenderId={tender.id}
              tenderStatus={tender.status}
              isWinner={tender.selectedId === offer.id}
              isMyVoteOffer={myVote?.offerId === offer.id}
              isManager={isManager}
              totalVotes={totalVotes}
              rank={idx + 1}
              deleteAction={deleteTenderOffer.bind(null, offer.id)}
            />
          ))}
        </div>
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
                        <SubmitButton size="sm" variant="outline">
                          <Trophy className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                          {offer.company}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tender.status === "CLOSED" && (
            <form action={reopenTender.bind(null, tender.id)}>
              <SubmitButton variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Ponovo otvori glasanje
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
