"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { syncPendingMirrors } from "@/server/actions/drive-sync"

interface DriveSyncCardProps {
  status: {
    enabled: boolean
    synced: number
    pending: number
    failed: number
    lastSyncedAt: string | null
    errors: { entity: string; entityId: string; message: string; attempts: number }[]
  }
}

// Gornja granica broja tura, da petlja ne moze da ostane zauvek u krug.
const MAX_ROUNDS = 60

export function DriveSyncCard({ status }: DriveSyncCardProps) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  async function handleSync() {
    setRunning(true)
    setProgress(null)

    let synced = 0
    let failed = 0

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const result = await syncPendingMirrors(20)
        synced += result.synced
        failed += result.failed

        if (result.errors.length > 0) {
          toast.error(result.errors[0], { duration: 8000 })
        }

        setProgress(
          `Уписано ${synced}, преостало ${result.remaining}${failed ? `, грешке ${failed}` : ""}`,
        )

        if (result.remaining === 0) break
      }

      if (failed > 0) {
        toast.error(`Синхронизација завршена са ${failed} грешака`)
      } else {
        toast.success(
          synced > 0
            ? `Синхронизовано ${synced} записа на Drive`
            : "Све је већ синхронизовано",
        )
      }
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Синхронизација није успела",
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Синхронизација са Drive-ом</CardTitle>
        <CardDescription>
          Сваки запис из апликације добија читљив документ у архиви на Google Drive-у, плус JSON снимак у фолдеру <code>_Podaci</code> из ког се подаци могу вратити у апликацију. Упис иде аутоматски при креирању, измени и брисању.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.enabled && (
          <p className="text-sm text-amber-700">
            Drive није конфигурисан — провери GDRIVE_* env варијабле. Подаци се чувају само у бази.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border p-3">
            <div className="text-xl font-semibold">{status.synced}</div>
            <div className="text-xs text-muted-foreground">на Drive-у</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xl font-semibold">{status.pending}</div>
            <div className="text-xs text-muted-foreground">на чекању</div>
          </div>
          <div className="rounded-lg border p-3">
            <div
              className={
                status.failed > 0
                  ? "text-xl font-semibold text-red-600"
                  : "text-xl font-semibold"
              }
            >
              {status.failed}
            </div>
            <div className="text-xs text-muted-foreground">greske</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Poslednji upis:{" "}
          {status.lastSyncedAt
            ? new Date(status.lastSyncedAt).toLocaleString("sr-RS")
            : "nikad"}
        </p>

        {status.errors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Записи који нису уписани</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {status.errors.map((e) => (
                <li key={`${e.entity}/${e.entityId}`} className="wrap-break-word">
                  <span className="font-mono">{e.entity}</span> — {e.message}
                  {e.attempts > 1 ? ` (${e.attempts} покушаја)` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSync}
            disabled={running || !status.enabled}
          >
            <RefreshCw
              className={running ? "w-4 h-4 mr-2 animate-spin" : "w-4 h-4 mr-2"}
            />
            {running ? "Синхронизујем..." : "Синхронизуј сада"}
          </Button>
          {progress && (
            <span className="text-xs text-muted-foreground">{progress}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
