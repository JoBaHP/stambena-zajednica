"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createTransaction, updateTransaction } from "@/server/actions/finansije"
import Link from "next/link"

interface Category {
  id: string
  name: string
  type: "INCOME" | "EXPENSE"
}

interface TransactionFormProps {
  categories: Category[]
  defaultValues?: {
    id?: string
    type?: string
    amount?: string
    description?: string
    date?: string
    categoryId?: string
    referenceNum?: string
    notes?: string
  }
}

export function TransactionForm({ categories, defaultValues }: TransactionFormProps) {
  const isEdit = !!defaultValues?.id
  const action = isEdit
    ? updateTransaction.bind(null, defaultValues!.id!)
    : createTransaction
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    (defaultValues?.type as "INCOME" | "EXPENSE") ?? "EXPENSE"
  )

  const filteredCategories = categories.filter((c) => c.type === type)

  const today = new Date().toISOString().split("T")[0]

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-5">
          {/* Tip: prihod ili rashod */}
          <div className="space-y-2">
            <Label>Tip</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                  type === "EXPENSE"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                Rashod
              </button>
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                  type === "INCOME"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                Prihod
              </button>
            </div>
            <input type="hidden" name="type" value={type} />
          </div>

          {/* Iznos */}
          <div className="space-y-2">
            <Label htmlFor="amount">Iznos (RSD)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              defaultValue={defaultValues?.amount}
            />
          </div>

          {/* Opis */}
          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Input
              id="description"
              name="description"
              placeholder="npr. Servis lifta - april 2026"
              required
              defaultValue={defaultValues?.description}
            />
          </div>

          {/* Datum */}
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={defaultValues?.date ?? today}
            />
          </div>

          {/* Kategorija */}
          <div className="space-y-2">
            <Label htmlFor="categoryId">Kategorija</Label>
            <select
              id="categoryId"
              name="categoryId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              defaultValue={defaultValues?.categoryId ?? ""}
            >
              <option value="">Bez kategorije</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Broj racuna/naloga */}
          <div className="space-y-2">
            <Label htmlFor="referenceNum">Broj racuna / naloga</Label>
            <Input
              id="referenceNum"
              name="referenceNum"
              placeholder="Opciono"
              defaultValue={defaultValues?.referenceNum}
            />
          </div>

          {/* Napomena */}
          <div className="space-y-2">
            <Label htmlFor="notes">Napomena</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Opciono"
              rows={3}
              defaultValue={defaultValues?.notes}
            />
          </div>

          {/* Dugmad */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">
              {isEdit ? "Sacuvaj izmene" : "Sacuvaj"}
            </Button>
            <Button type="button" variant="outline" render={<Link href="/dashboard/finansije" />}>
              Otkazi
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
