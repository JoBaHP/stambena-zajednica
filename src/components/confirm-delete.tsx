"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface ConfirmDeleteProps {
  action: () => void
  label?: string
  confirmLabel?: string
  className?: string
}

export function ConfirmDelete({
  action,
  label = "Obrisi",
  confirmLabel = "Potvrdi brisanje",
  className,
}: ConfirmDeleteProps) {
  const [confirming, setConfirming] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  if (confirming) {
    return (
      <div className={`flex gap-2 ${className ?? ""}`}>
        <form ref={formRef} action={action}>
          <Button variant="destructive" type="submit">
            {confirmLabel}
          </Button>
        </form>
        <Button variant="outline" onClick={() => setConfirming(false)}>
          Otkazi
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="destructive"
      type="button"
      className={className}
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
