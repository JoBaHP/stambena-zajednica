"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const STORAGE_KEY = "pasterova:lastSeenAnnouncementAt"
const POLL_INTERVAL_MS = 60_000

export function AnnouncementWatcher() {
  const router = useRouter()
  const initializedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch("/api/notifications/latest", { cache: "no-store" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          latest: {
            id: string
            title: string
            priority: "NORMAL" | "URGENT"
            publishedAt: string
          } | null
        }

        if (!data.latest) return

        const stored = window.localStorage.getItem(STORAGE_KEY)
        const latestTime = new Date(data.latest.publishedAt).getTime()

        if (!initializedRef.current) {
          initializedRef.current = true
          if (!stored) {
            window.localStorage.setItem(STORAGE_KEY, String(latestTime))
            return
          }
        }

        const lastSeen = stored ? Number(stored) : 0
        if (latestTime > lastSeen) {
          window.localStorage.setItem(STORAGE_KEY, String(latestTime))
          const isUrgent = data.latest.priority === "URGENT"
          const showToast = isUrgent ? toast.error : toast.info
          showToast(
            isUrgent ? `Hitno: ${data.latest.title}` : `Novo obavestenje: ${data.latest.title}`,
            {
              description: "Klikni za detalje",
              duration: isUrgent ? 15_000 : 8_000,
              action: {
                label: "Otvori",
                onClick: () => router.push("/dashboard/obavestenja"),
              },
            },
          )
        }
      } catch {
        // ignore network errors silently
      }
    }

    check()
    const id = window.setInterval(check, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [router])

  return null
}
