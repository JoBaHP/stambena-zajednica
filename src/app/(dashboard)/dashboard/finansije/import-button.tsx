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

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await importFinanceSheet()
        setSummary(result)

        const parts = []
        if (result.created) parts.push(`ново: ${result.created}`)
        if (result.updated) parts.push(`ажурирано: ${result.updated}`)
        if (result.removed) parts.push(`уклоњено: ${result.removed}`)
        toast.success(
          parts.length ? `Освежено — ${parts.join(", ")}` : "Нема промена",
          { duration: 6000 },
        )
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Читање табеле није успело",
        )
      }
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
