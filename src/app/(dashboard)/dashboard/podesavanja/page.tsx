"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { changePassword } from "@/server/actions/account"

export default function PodesavanjaPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)

    const formData = new FormData(form)
    const result = await changePassword(formData)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Lozinka je uspesno promenjena")
      form.reset()
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Podesavanja</h1>
        <p className="text-sm text-muted-foreground mt-1">Upravljanje vasim nalogom</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promena lozinke</CardTitle>
          <CardDescription>Unesite trenutnu i novu lozinku</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Trenutna lozinka</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova lozinka</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potvrdite novu lozinku</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Menjam..." : "Promeni lozinku"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
