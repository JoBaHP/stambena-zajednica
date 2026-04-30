"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateNotificationPreferences } from "@/server/actions/account"

interface NotificationsFormProps {
  defaults: {
    notifyEmail: boolean
    notifySms: boolean
    phone: string | null
    email: string
  }
}

export function NotificationsForm({ defaults }: NotificationsFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)

    const formData = new FormData(form)
    const result = await updateNotificationPreferences(formData)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Podesavanja sacuvana")
    }

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notifikacije</CardTitle>
        <CardDescription>
          Izaberi kako zelis da primas vazna obavestenja
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="notifyEmail"
              name="notifyEmail"
              defaultChecked={defaults.notifyEmail}
              className="h-4 w-4 mt-1 rounded border-gray-300"
            />
            <div>
              <Label htmlFor="notifyEmail" className="font-normal">
                Email notifikacije
              </Label>
              <p className="text-xs text-muted-foreground">
                Salju se na: {defaults.email}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="notifySms"
              name="notifySms"
              defaultChecked={defaults.notifySms}
              className="h-4 w-4 mt-1 rounded border-gray-300"
            />
            <div>
              <Label htmlFor="notifySms" className="font-normal">
                SMS notifikacije
              </Label>
              <p className="text-xs text-muted-foreground">
                Samo za hitne stvari (urgentna obavestenja, kriticni zahtevi)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Broj telefona</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={defaults.phone ?? ""}
              placeholder="+381 60 123 4567"
            />
            <p className="text-xs text-muted-foreground">
              Format sa pozivnim brojem (npr. +381...)
            </p>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Cuvam..." : "Sacuvaj"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
