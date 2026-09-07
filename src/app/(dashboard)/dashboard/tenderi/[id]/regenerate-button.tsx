"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { regenerateSummary } from "@/server/actions/tenderi"

export function RegenerateButton({ offerId }: { offerId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      try {
        await regenerateSummary(offerId)
        router.refresh()
        toast.success("Сажетак генерисан")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Грешка при генерисању сажетка")
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-indigo-600 transition-colors disabled:opacity-50"
    >
      <Sparkles className={`w-3.5 h-3.5 ${pending ? "animate-pulse" : ""}`} />
      {pending ? "Генеришем..." : "Генериши АИ сажетак"}
    </button>
  )
}
