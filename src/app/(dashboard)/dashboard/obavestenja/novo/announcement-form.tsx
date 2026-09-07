"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"
import { createAnnouncement, generateAnnouncementText } from "@/server/actions/obavestenja"
import Link from "next/link"

export function AnnouncementForm() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [priority, setPriority] = useState("NORMAL")
  const [aiPending, startAi] = useTransition()

  function handleGenerate() {
    if (!title.trim()) {
      toast.error("Унесите наслов пре генерисања текста")
      return
    }
    startAi(async () => {
      try {
        const text = await generateAnnouncementText(title, priority)
        setBody(text)
        toast.success("Текст генерисан — можете га изменити пре објаве")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Грешка")
      }
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={createAnnouncement} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Наслов</Label>
            <Input
              id="title"
              name="title"
              placeholder="нпр. Ремонт лифта"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Текст</Label>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={aiPending || !title.trim()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-indigo-600 transition-colors disabled:opacity-40"
              >
                <Sparkles className={`w-3.5 h-3.5 ${aiPending ? "animate-pulse" : ""}`} />
                {aiPending ? "Генерише..." : "Предложи АИ текст"}
              </button>
            </div>
            <Textarea
              id="body"
              name="body"
              placeholder="Садржај обавештења..."
              rows={6}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Приоритет</Label>
            <select
              id="priority"
              name="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="NORMAL">Нормалан</option>
              <option value="URGENT">Хитно</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPinned"
              name="isPinned"
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isPinned" className="font-normal">Закачи на врх</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Истиче (опционо)</Label>
            <Input id="expiresAt" name="expiresAt" type="date" />
          </div>

          <div className="flex gap-3 pt-2">
            <SubmitButton className="flex-1">Објави</SubmitButton>
            <Button type="button" variant="outline" render={<Link href="/dashboard/obavestenja" />}>
              Откажи
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
