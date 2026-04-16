"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus } from "lucide-react"
import { createPoll } from "@/server/actions/glasanje"
import Link from "next/link"

export default function NovoGlasanjePage() {
  const [options, setOptions] = useState(["", ""])

  function addOption() {
    setOptions([...options, ""])
  }

  function removeOption(index: number) {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo glasanje</h1>
        <p className="text-sm text-muted-foreground mt-1">Kreiraj anketu za stanare</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createPoll} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Pitanje / Naslov</Label>
              <Input
                id="title"
                name="title"
                placeholder="npr. Da li ste za renoviranje ulaza?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis (opciono)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Dodatne informacije o glasanju..."
                rows={3}
              />
            </div>

            {/* Opcije */}
            <div className="space-y-3">
              <Label>Opcije za glasanje</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    name="option"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Opcija ${i + 1}`}
                    required
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(i)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="w-4 h-4 mr-1" /> Dodaj opciju
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endsAt">Glasanje traje do (opciono)</Label>
              <Input id="endsAt" name="endsAt" type="date" />
            </div>

            <div className="space-y-2">
              <Label>Objavi odmah?</Label>
              <select
                name="status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="DRAFT">Sacuvaj kao nacrt</option>
                <option value="ACTIVE">Objavi odmah (aktivno)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Kreiraj</Button>
              <Button type="button" variant="outline" render={<Link href="/dashboard/glasanje" />}>
                Otkazi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
