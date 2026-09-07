"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Camera, X } from "lucide-react"
import { createRequest } from "@/server/actions/zahtevi"

const MAX_PHOTOS = 5
const MAX_EDGE = 1600
const QUALITY = 0.82

type Photo = { file: File; preview: string }

/**
 * Fotografija sa telefona ume da bude 4-5 MB, a Vercel odbija telo zahteva
 * prek 4.5 MB. Zato se slika smanji ovde, pre slanja — 1600px po duzoj ivici
 * spusta je na par stotina kilobajta bez vidljivog gubitka za prijavu kvara.
 * `createImageBitmap` sa `from-image` postuje EXIF rotaciju, pa slike sa
 * telefona ne stizu izvrnute.
 */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  )
  if (!blob) return file

  const name = file.name.replace(/\.[^.]+$/, "") || "foto"
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" })
}

export function RequestForm() {
  const [pending, startTransition] = useTransition()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length === 0) return
    if (fileRef.current) fileRef.current.value = ""

    const room = MAX_PHOTOS - photos.length
    if (room <= 0) {
      toast.error(`Najvise ${MAX_PHOTOS} fotografije po zahtevu`)
      return
    }

    setProcessing(true)
    try {
      const next: Photo[] = []
      for (const file of picked.slice(0, room)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} није слика`)
          continue
        }
        const shrunk = await shrink(file)
        next.push({ file: shrunk, preview: URL.createObjectURL(shrunk) })
      }
      setPhotos((prev) => [...prev, ...next])
      if (picked.length > room) {
        toast.info(`Додато је првих ${room} — ограничење је ${MAX_PHOTOS}`)
      }
    } catch {
      toast.error("Није успело учитавање фотографије")
    } finally {
      setProcessing(false)
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // Polje za izbor fajla nema `name`, pa u FormData ulaze samo smanjene slike.
    for (const p of photos) formData.append("photo", p.file)

    startTransition(async () => {
      try {
        await createRequest(formData)
      } catch (err) {
        // redirect() iz akcije stize kao izuzetak koji Next sam obradi.
        if (err && typeof err === "object" && "digest" in err) throw err
        toast.error(err instanceof Error ? err.message : "Слање није успело")
      }
    })
  }

  const totalKb = Math.round(
    photos.reduce((sum, p) => sum + p.file.size, 0) / 1024,
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Наслов</Label>
        <Input id="title" name="title" required placeholder="нпр. Цури вода у подруму" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Опис</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={4}
          placeholder="Опишите проблем што детаљније"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Категорија</Label>
          <select
            id="category"
            name="category"
            required
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="PLUMBING">Водовод</option>
            <option value="ELECTRICAL">Електрика</option>
            <option value="ELEVATOR">Лифт</option>
            <option value="HEATING">Грејање</option>
            <option value="CLEANING">Чишћење</option>
            <option value="STRUCTURAL">Грађевински</option>
            <option value="OTHER">Остало</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Приоритет</Label>
          <select
            id="priority"
            name="priority"
            defaultValue="NORMAL"
            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="LOW">Низак</option>
            <option value="NORMAL">Нормалан</option>
            <option value="HIGH">Висок</option>
            <option value="URGENT">Хитно</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Локација</Label>
        <Input id="location" name="location" placeholder="нпр. подрум, 3. спрат, улаз" />
      </div>

      <div className="space-y-2">
        <Label>Фотографије</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFiles}
          className="hidden"
          id="photo-picker"
        />
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.preview}
                alt={`Fotografija ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label={`Уклони фотографију ${i + 1}`}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <Button
              type="button"
              variant="outline"
              disabled={processing}
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 flex-col gap-1"
            >
              <Camera className="w-5 h-5" />
              <span className="text-xs">{processing ? "..." : "Додај"}</span>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          До {MAX_PHOTOS} фотографије. На телефону се отвара камера; слике се
          аутоматски смањују пре слања
          {photos.length > 0 ? ` (тренутно ${totalKb} KB)` : ""}.
        </p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={pending || processing}>
          {pending ? "Шаљем..." : "Пошаљи захтев"}
        </Button>
        <Button type="button" variant="outline" render={<Link href="/dashboard/zahtevi" />}>
          Откажи
        </Button>
      </div>
    </form>
  )
}
