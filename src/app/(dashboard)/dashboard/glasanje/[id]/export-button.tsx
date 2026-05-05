"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Download } from "lucide-react"
import { exportPollResults } from "@/server/actions/glasanje"

export function ExportPollResultsButton({ pollId }: { pollId: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        const res = await exportPollResults(pollId)
        toast.success(`Rezultati su sacuvani u Drive: ${res.fileName}`, {
          duration: 6000,
        })
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Greska pri eksportu",
        )
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={pending}
    >
      <Download className="w-4 h-4 mr-2" />
      {pending ? "Eksportujem..." : "Eksportuj u Drive"}
    </Button>
  )
}
