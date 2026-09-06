import { Skeleton } from "@/components/ui/skeleton"

/**
 * Kostur stranice dok se podaci ucitavaju.
 *
 * Next prikazuje loading.tsx cim korisnik klikne na link, pre nego sto server
 * zavrsi upite — bez toga navigacija izgleda kao da se nista nije desilo, jer
 * stara stranica stoji sve dok nova ne bude gotova.
 */
export function PageSkeleton({
  stats = 0,
  rows = 5,
  filters = false,
}: {
  /** Broj kartica sa brojkama iznad liste. */
  stats?: number
  /** Broj redova u listi. */
  rows?: number
  /** Ostavi mesto za red sa filterima. */
  filters?: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {filters && <Skeleton className="h-9 w-full max-w-md" />}

      {stats > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
