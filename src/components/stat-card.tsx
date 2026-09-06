import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { moduleAccent, type ModuleKey } from "@/lib/modules"

/**
 * Kartica sa jednom brojkom i obojenom ikonicom modula.
 * Boja stoji samo u ikonici i kvadratu iza nje — ostatak kartice je miran.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  module,
  href,
  children,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  hint?: React.ReactNode
  icon: LucideIcon
  module: ModuleKey
  href?: string
  children?: React.ReactNode
}) {
  const accent = moduleAccent[module]

  const body = (
    <div className="card-lift h-full rounded-xl border bg-card p-4 sm:p-5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: accent.tint }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accent.color }} />
        </span>
      </div>

      <p className="text-2xl font-bold tracking-tight leading-tight nums">
        {value}
        {unit && (
          <span className="text-sm font-semibold text-muted-foreground"> {unit}</span>
        )}
      </p>

      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      {children}
    </div>
  )

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  )
}

/** Zaglavlje sekcije sa ikonicom modula. */
export function SectionTitle({
  title,
  icon: Icon,
  module,
  action,
}: {
  title: string
  icon: LucideIcon
  module: ModuleKey
  action?: React.ReactNode
}) {
  const accent = moduleAccent[module]
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4" style={{ color: accent.color }} />
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      {action}
    </div>
  )
}
