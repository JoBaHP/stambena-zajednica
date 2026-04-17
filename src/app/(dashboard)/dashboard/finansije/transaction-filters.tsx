"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"

interface Category {
  id: string
  name: string
  type: "INCOME" | "EXPENSE"
}

interface TransactionFiltersProps {
  categories: Category[]
}

export function TransactionFilters({ categories }: TransactionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const mesec = searchParams.get("mesec") ?? ""
  const tip = searchParams.get("tip") ?? ""
  const kategorija = searchParams.get("kategorija") ?? ""

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const clearFilters = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  const hasFilters = mesec || tip || kategorija

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="month"
        value={mesec}
        onChange={(e) => updateFilter("mesec", e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <select
        value={tip}
        onChange={(e) => updateFilter("tip", e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Svi tipovi</option>
        <option value="INCOME">Prihodi</option>
        <option value="EXPENSE">Rashodi</option>
      </select>
      <select
        value={kategorija}
        onChange={(e) => updateFilter("kategorija", e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Sve kategorije</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Resetuj filtere
        </button>
      )}
    </div>
  )
}
