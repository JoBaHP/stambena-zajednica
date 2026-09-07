"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { changePassword } from "@/server/actions/account"

export function PasswordForm() {
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
      toast.success("Лозинка је успешно промењена")
      form.reset()
    }

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Промена лозинке</CardTitle>
        <CardDescription>Унесите тренутну и нову лозинку</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Тренутна лозинка</Label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Нова лозинка</Label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Потврдите нову лозинку</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Мењам..." : "Промени лозинку"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
