"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { compareOffers } from "@/server/actions/tenderi"

export function CompareButton({ tenderId, hasComparison }: { tenderId: string; hasComparison: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleCompare() {
    startTransition(async () => {
      try {
        await compareOffers(tenderId)
        router.refresh()
        toast.success("AI поређење генерисано")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Грешка")
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCompare} disabled={pending}>
      <Sparkles className={`w-4 h-4 mr-2 ${pending ? "animate-pulse" : ""}`} />
      {pending ? "Генерише..." : hasComparison ? "Освежи AI поређење" : "AI поређење понуда"}
    </Button>
  )
}
