"use client"

import { useEffect } from "react"

const INTERVAL_MS = 3 * 60 * 1000

export function ActivityPing() {
  useEffect(() => {
    const ping = () => fetch("/api/ping", { method: "POST" })
    ping()
    const id = setInterval(ping, INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return null
}
