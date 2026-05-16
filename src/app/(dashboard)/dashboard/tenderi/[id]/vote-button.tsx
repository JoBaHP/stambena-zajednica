"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { castVote } from "@/server/actions/tenderi"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export function VoteButton({
  tenderId,
  offerId,
  isMyVote,
  disabled,
}: {
  tenderId: string
  offerId: string
  isMyVote: boolean
  disabled: boolean
}) {
  const [pending, startTransition] = useTransition()

  function handleVote() {
    startTransition(async () => {
      try {
        await castVote(tenderId, offerId)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Greška pri glasanju")
      }
    })
  }

  if (disabled) return null

  return (
    <Button
      size="sm"
      variant={isMyVote ? "default" : "outline"}
      onClick={handleVote}
      disabled={pending}
      className="shrink-0"
    >
      {isMyVote && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
      {pending ? "..." : isMyVote ? "Vaš glas" : "Glasaj"}
    </Button>
  )
}
