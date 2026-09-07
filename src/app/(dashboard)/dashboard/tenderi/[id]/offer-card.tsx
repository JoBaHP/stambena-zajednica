"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download, Trophy, ChevronDown, ChevronUp } from "lucide-react"
import { VoteButton } from "./vote-button"
import { RegenerateButton } from "./regenerate-button"
import { ConfirmDelete } from "@/components/confirm-delete"

type Offer = {
  id: string
  company: string
  price: number | null
  description: string | null
  aiSummary: string | null
  fileId: string | null
  fileName: string | null
  _count: { votes: number }
}

type OfferCardProps = {
  offer: Offer
  tenderId: string
  tenderStatus: string
  isWinner: boolean
  isMyVoteOffer: boolean
  isManager: boolean
  totalVotes: number
  rank: number
  deleteAction: () => Promise<void>
}

export function OfferCard({
  offer,
  tenderId,
  tenderStatus,
  isWinner,
  isMyVoteOffer,
  isManager,
  totalVotes,
  rank,
  deleteAction,
}: OfferCardProps) {
  const [expanded, setExpanded] = useState(false)
  const voteCount = offer._count.votes
  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
  const hasMore = !!(offer.aiSummary || offer.description || offer.fileId)

  return (
    <Card
      className={
        isWinner
          ? "border-amber-300 bg-amber-50/50"
          : isMyVoteOffer
            ? "border-primary/40"
            : ""
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isWinner && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
            <CardTitle className="text-sm leading-snug">
              {tenderStatus === "CLOSED" ? `${rank}. ` : ""}
              {offer.company}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <VoteButton
              tenderId={tenderId}
              offerId={offer.id}
              isMyVote={isMyVoteOffer}
              disabled={tenderStatus !== "OPEN"}
            />
            {isManager && <ConfirmDelete action={deleteAction} />}
          </div>
        </div>

        {offer.price !== null && (
          <p className="text-sm font-semibold text-indigo-700 mt-1">
            {Number(offer.price).toLocaleString("sr-RS", {
              minimumFractionDigits: 2,
            })}{" "}
            РСД
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {voteCount} {voteCount === 1 ? "glas" : "glasova"} ({pct}%)
          </p>
        </div>

        {offer.aiSummary ? (
          <div className="rounded-md bg-indigo-50 border border-indigo-100 px-3 py-2">
            <p className="text-[11px] font-medium text-indigo-700 mb-1">AI сажетак</p>
            <p
              className={`text-xs text-indigo-900 leading-relaxed ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {offer.aiSummary}
            </p>
          </div>
        ) : (
          isManager && offer.fileId && <RegenerateButton offerId={offer.id} />
        )}

        {expanded && (
          <>
            {offer.description && (
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            )}
            {offer.fileId && (
              <a
                href={`/api/tenderi/${offer.id}/download`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {offer.fileName ?? "Преузми"}
                <Download className="w-3 h-3" />
              </a>
            )}
          </>
        )}

        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Прикажи мање
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Прикажи више
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
