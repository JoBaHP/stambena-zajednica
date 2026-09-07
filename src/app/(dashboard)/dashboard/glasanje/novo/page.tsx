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
        <h1 className="text-2xl font-semibold">Ново гласање</h1>
        <p className="text-sm text-muted-foreground mt-1">Креирај анкету за станаре</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={createPoll} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Питање / Наслов</Label>
              <Input
                id="title"
                name="title"
                placeholder="нпр. Да ли сте за реновирање улаза?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Опис (опционо)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Додатне информације о гласању..."
                rows={3}
              />
            </div>

            {/* Opcije */}
            <div className="space-y-3">
              <Label>Опције за гласање</Label>
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
                <Plus className="w-4 h-4 mr-1" /> Додај опцију
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endsAt">Гласање траје до (опционо)</Label>
              <Input id="endsAt" name="endsAt" type="date" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredShare">Потребна већина</Label>
              <select
                id="requiredShare"
                name="requiredShare"
                defaultValue="50"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="50">Обична већина — преко 50% удела</option>
                <option value="66">Двотрећинска већина — преко 66% удела</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Рачуна се према квадратури станова, не према броју гласова.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Објави одмах?</Label>
              <select
                name="status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="DRAFT">Сачувај као нацрт</option>
                <option value="ACTIVE">Објави одмах (активно)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Креирај</Button>
              <Button type="button" variant="outline" render={<Link href="/dashboard/glasanje" />}>
                Откажи
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
