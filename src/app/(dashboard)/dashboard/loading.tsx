export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted rounded-md" />
        <div className="h-4 w-72 bg-muted/70 rounded-md" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-7 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/60 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  )
}
