"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw, TriangleAlert } from "lucide-react"
import {
  importFinanceSheet,
  type ImportSummary,
} from "@/server/actions/finansije-uvoz"

/**
 * Дугме за освежавање финансија из табеле на Drive-у.
 *
 * Табела остаје извор истине; ово је ручни повлачење, да управник види шта је
 * ушло пре него што бројке одu станарима.
 */
export function ImportSheetButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    startTransition(async () => {
      const result = await importFinanceSheet()

      if (!result.ok) {
        setSummary(null)
        setError(result.error)
        toast.error(result.error, { duration: 10000 })
        return
      }

      setError(null)
      setSummary(result.summary)

      const parts = []
      if (result.summary.created) parts.push(`ново: ${result.summary.created}`)
      if (result.summary.updated) parts.push(`ажурирано: ${result.summary.updated}`)
      if (result.summary.removed) parts.push(`уклоњено: ${result.summary.removed}`)
      toast.success(
        parts.length
          ? `Освежено — ${parts.join(", ")}`
          : `Нема промена (${result.summary.unchanged} ставки већ усклађено)`,
        { duration: 6000 },
      )
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={pending}
      >
        <RefreshCw
          className={pending ? "w-4 h-4 mr-2 animate-spin" : "w-4 h-4 mr-2"}
        />
        {pending ? "Читам табелу..." : "Освежи из табеле"}
      </Button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 flex gap-3">
          <TriangleAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Освежавање није успело</p>
            <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {summary && summary.problems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-bold">
              {summary.problems.length}{" "}
              {summary.problems.length === 1 ? "ред" : "реда"} у табели нису
              увезена
            </p>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {summary.problems.map((p) => (
              <li key={`${p.sheet}-${p.row}`}>
                <span className="font-semibold text-foreground">
                  {p.sheet}, ред {p.row}
                </span>{" "}
                — {p.reason}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Допуни их у табели па поново освежи. Док то не урадиш, приказане
            бројке не одговарају стварном стању рачуна.
          </p>
        </div>
      )}
    </div>
  )
}
