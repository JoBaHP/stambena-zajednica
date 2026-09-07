"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { CheckCircle2, Copy } from "lucide-react"
import {
  approveAccessRequest,
  rejectAccessRequest,
} from "@/server/actions/pristup"

type Mode = "idle" | "approve" | "reject"

type ApprovedInfo = { name: string; email: string; password: string }

export function AccessRequestActions({
  id,
  defaultPassword,
}: {
  id: string
  defaultPassword: string
}) {
  const [mode, setMode] = useState<Mode>("idle")
  const [pending, startTransition] = useTransition()
  const [approved, setApproved] = useState<ApprovedInfo | null>(null)

  function handleApprove(formData: FormData) {
    startTransition(async () => {
      try {
        const result = await approveAccessRequest(id, formData)
        if (result) setApproved(result)
        setMode("idle")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Грешка")
      }
    })
  }

  function handleReject(formData: FormData) {
    startTransition(async () => {
      try {
        await rejectAccessRequest(id, formData)
        toast.success("Захтев одбијен. Корисник је обавештен емаилом.")
        setMode("idle")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Грешка")
      }
    })
  }

  if (approved) {
    return (
      <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Одобрено — подаци за пријаву
        </div>
        <div className="text-xs space-y-1 font-mono bg-white rounded border px-3 py-2">
          <div>Email: <span className="font-semibold">{approved.email}</span></div>
          <div className="flex items-center gap-2">
            Lozinka: <span className="font-semibold">{approved.password}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(approved.password)
                toast.success("Лозинка копирана")
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Емаил је послат на {approved.email}. Ако не стигне, саопшти лозинку директно.
        </p>
      </div>
    )
  }

  if (mode === "approve") {
    return (
      <form action={handleApprove} className="space-y-3 mt-3">
        <div className="space-y-1.5">
          <Label htmlFor={`password-${id}`}>Почетна лозинка</Label>
          <Input
            id={`password-${id}`}
            name="password"
            type="text"
            defaultValue={defaultPassword}
            required
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Лозинка ће бити послата кориснику емаилом.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Одобравање..." : "Потврди одобрење"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("idle")}
            disabled={pending}
          >
            Откажи
          </Button>
        </div>
      </form>
    )
  }

  if (mode === "reject") {
    return (
      <form action={handleReject} className="space-y-3 mt-3">
        <div className="space-y-1.5">
          <Label htmlFor={`note-${id}`}>Разлог одбијања (опционо)</Label>
          <Textarea
            id={`note-${id}`}
            name="note"
            rows={2}
            placeholder="Биће укључено у емаил обавештење."
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Одбијање..." : "Потврди одбијање"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMode("idle")}
            disabled={pending}
          >
            Откажи
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex gap-2 mt-3">
      <Button onClick={() => setMode("approve")}>Одобри</Button>
      <Button variant="outline" onClick={() => setMode("reject")}>
        Одбиј
      </Button>
    </div>
  )
}
