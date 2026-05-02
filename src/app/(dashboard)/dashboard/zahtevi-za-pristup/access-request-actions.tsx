"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  approveAccessRequest,
  rejectAccessRequest,
} from "@/server/actions/pristup"

type Mode = "idle" | "approve" | "reject"

export function AccessRequestActions({
  id,
  defaultPassword,
}: {
  id: string
  defaultPassword: string
}) {
  const [mode, setMode] = useState<Mode>("idle")
  const [pending, startTransition] = useTransition()

  function handleApprove(formData: FormData) {
    startTransition(async () => {
      try {
        await approveAccessRequest(id, formData)
        toast.success("Zahtev odobren. Korisnik je dobio email sa lozinkom.")
        setMode("idle")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Greska")
      }
    })
  }

  function handleReject(formData: FormData) {
    startTransition(async () => {
      try {
        await rejectAccessRequest(id, formData)
        toast.success("Zahtev odbijen. Korisnik je obavesten emailom.")
        setMode("idle")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Greska")
      }
    })
  }

  if (mode === "approve") {
    return (
      <form action={handleApprove} className="space-y-3 mt-3">
        <div className="space-y-1.5">
          <Label htmlFor={`password-${id}`}>Pocetna lozinka</Label>
          <Input
            id={`password-${id}`}
            name="password"
            type="text"
            defaultValue={defaultPassword}
            required
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Lozinka ce biti poslata korisniku emailom. Preporuciti mu da je
            promeni nakon prve prijave.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Odobravanje..." : "Potvrdi odobrenje"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("idle")}
            disabled={pending}
          >
            Otkazi
          </Button>
        </div>
      </form>
    )
  }

  if (mode === "reject") {
    return (
      <form action={handleReject} className="space-y-3 mt-3">
        <div className="space-y-1.5">
          <Label htmlFor={`note-${id}`}>Razlog odbijanja (opciono)</Label>
          <Textarea
            id={`note-${id}`}
            name="note"
            rows={2}
            placeholder="Bice ukljuceno u email obavestenje."
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Odbijanje..." : "Potvrdi odbijanje"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("idle")}
            disabled={pending}
          >
            Otkazi
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex gap-2 mt-3">
      <Button onClick={() => setMode("approve")}>Odobri</Button>
      <Button variant="outline" onClick={() => setMode("reject")}>
        Odbij
      </Button>
    </div>
  )
}
