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
          `Upisano ${synced}, preostalo ${result.remaining}${failed ? `, greske ${failed}` : ""}`,
        )

        if (result.remaining === 0) break
      }

      if (failed > 0) {
        toast.error(`Sinhronizacija zavrsena sa ${failed} greska/greske`)
      } else {
        toast.success(
          synced > 0
            ? `Sinhronizovano ${synced} zapisa na Drive`
            : "Sve je vec sinhronizovano",
        )
      }
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Sinhronizacija nije uspela",
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sinhronizacija sa Drive-om</CardTitle>
        <CardDescription>
          Svaki zapis iz aplikacije dobija citljiv dokument u arhivi na Google
          Drive-u, plus JSON snimak u folderu <code>_Podaci</code> iz kog se
          podaci mogu vratiti u aplikaciju. Upis ide automatski pri kreiranju,
          izmeni i brisanju.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.enabled && (
          <p className="text-sm text-amber-700">
            Drive nije konfigurisan — proveri GDRIVE_* env varijable. Podaci se
            cuvaju samo u bazi.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border p-3">
            <div className="text-xl font-semibold">{status.synced}</div>
            <div className="text-xs text-muted-foreground">na Drive-u</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xl font-semibold">{status.pending}</div>
            <div className="text-xs text-muted-foreground">na cekanju</div>
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
            <p className="text-sm font-medium">Zapisi koji nisu upisani</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {status.errors.map((e) => (
                <li key={`${e.entity}/${e.entityId}`} className="wrap-break-word">
                  <span className="font-mono">{e.entity}</span> — {e.message}
                  {e.attempts > 1 ? ` (${e.attempts} pokusaja)` : ""}
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
            {running ? "Sinhronizujem..." : "Sinhronizuj sada"}
          </Button>
          {progress && (
            <span className="text-xs text-muted-foreground">{progress}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
