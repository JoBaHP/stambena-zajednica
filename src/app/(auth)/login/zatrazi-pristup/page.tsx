"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Building2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { createAccessRequest } from "@/server/actions/pristup"

export default function ZatraziPristupPage() {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<{
    unitOccupied: boolean
    unit: string | null
  } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createAccessRequest(formData)
      if (res?.error) {
        toast.error(res.error)
        return
      }
      if (res?.success) {
        setDone({
          unitOccupied: !!res.unitOccupied,
          unit: res.unit ?? null,
        })
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-indigo-700 shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Пастерова 16</h1>
          <p className="text-sm text-muted-foreground mt-1">Стамбена заједница</p>
        </div>

        <Card className="shadow-sm">
          {done ? (
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Захтев је примљен</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Управник је обавештен. Добићеш емаил када захтев буде прегледан.
                  </p>
                </div>
              </div>

              {done.unitOccupied && done.unit && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-900">
                    Стан <strong>{done.unit}</strong> већ има регистрованог корисника. Управник ће проверити власништво пре одобрења — ако си нови власник или станар, можда ће те контактирати ради потврде.
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/login" />}
              >
                Назад на пријаву
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Затражи приступ</CardTitle>
                <CardDescription>
                  Попуни форму и управник ће ти одобрити приступ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Име и презиме</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Петар Петровић"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Емаил</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="vas@email.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Телефон</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="+381..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="unit">Стан</Label>
                      <Input id="unit" name="unit" placeholder="нпр. 5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">Напомена</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={3}
                      placeholder="Нпр. нови власник од 01.05.2026, претходни власник је..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? "Слање..." : "Пошаљи захтев"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    render={<Link href="/login" />}
                  >
                    Назад на пријаву
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
