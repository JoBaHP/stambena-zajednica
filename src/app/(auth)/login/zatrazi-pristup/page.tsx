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
          <h1 className="text-2xl font-semibold tracking-tight">Pasterova 16</h1>
          <p className="text-sm text-muted-foreground mt-1">Stambena Zajednica</p>
        </div>

        <Card className="shadow-sm">
          {done ? (
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Zahtev je primljen</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upravnik je obavesten. Dobices email kada zahtev bude
                    pregledan.
                  </p>
                </div>
              </div>

              {done.unitOccupied && done.unit && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-900">
                    Stan <strong>{done.unit}</strong> vec ima registrovanog
                    korisnika. Upravnik ce proveriti vlasnistvo pre odobrenja —
                    ako si novi vlasnik ili stanar, mozda ce te kontaktirati
                    radi potvrde.
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/login" />}
              >
                Nazad na prijavu
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Zatrazi pristup</CardTitle>
                <CardDescription>
                  Popuni formu i upravnik ce ti odobriti pristup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Ime i prezime</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Petar Petrovic"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
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
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="+381..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="unit">Stan</Label>
                      <Input id="unit" name="unit" placeholder="npr. 5" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">Napomena</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={3}
                      placeholder="Npr. novi vlasnik od 01.05.2026, prethodni vlasnik je..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? "Slanje..." : "Posalji zahtev"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    render={<Link href="/login" />}
                  >
                    Nazad na prijavu
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
