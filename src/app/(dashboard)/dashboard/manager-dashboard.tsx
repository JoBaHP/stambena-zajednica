import Link from "next/link"
import { db } from "@/lib/db"
import { StatCard, SectionTitle } from "@/components/stat-card"
import { moduleAccent } from "@/lib/modules"
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  HardHat,
  Megaphone,
  Pin,
  Vote,
  Wrench,
} from "lucide-react"

const MONTHS_SHORT = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "avg", "sep", "okt", "nov", "dec",
]

function rsd(value: number): string {
  return Math.round(value).toLocaleString("sr-RS")
}

export async function ManagerDashboard({ name }: { name: string }) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    income,
    expense,
    monthIncome,
    openRequests,
    urgentRequests,
    activePoll,
    investments,
    pendingAccess,
    ownersTotal,
    ownersWithArea,
    nextInspection,
    announcements,
    upcomingTasks,
  ] = await Promise.all([
    db.transaction.aggregate({ where: { type: "INCOME" }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { type: "EXPENSE" }, _sum: { amount: true } }),
    db.transaction.aggregate({
      where: { type: "INCOME", date: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.maintenanceRequest.count({ where: { status: { in: ["SUBMITTED", "IN_PROGRESS"] } } }),
    db.maintenanceRequest.count({
      where: { status: { in: ["SUBMITTED", "IN_PROGRESS"] }, priority: "URGENT" },
    }),
    db.poll.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { options: { select: { id: true, text: true } }, _count: { select: { votes: true } } },
    }),
    db.investment.findMany({
      where: { status: "IN_PROGRESS" },
      select: { title: true, budget: true, spent: true },
    }),
    db.accessRequest.count({ where: { status: "PENDING" } }),
    db.user.count({ where: { active: true, unit: { not: null } } }),
    db.user.count({ where: { active: true, unit: { not: null }, area: { not: null } } }),
    db.pPInspection.findFirst({
      where: { nextDueDate: { not: null } },
      orderBy: { nextDueDate: "asc" },
      select: { title: true, nextDueDate: true },
    }),
    db.announcement.findMany({
      where: {
        publishedAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 3,
      select: { id: true, title: true, priority: true, isPinned: true, publishedAt: true },
    }),
    db.task.findMany({
      where: { status: "PENDING" },
      orderBy: { dueDate: "asc" },
      take: 3,
      select: { id: true, title: true, dueDate: true, category: true, recurrence: true },
    }),
  ])

  const balance = Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0)
  const missingArea = ownersTotal - ownersWithArea

  // Kvorum aktivnog glasanja — bez uvoza celog proracuna, samo izlaznost.
  let quorumPct: number | null = null
  if (activePoll && ownersWithArea === ownersTotal && ownersTotal > 0) {
    const [owners, votes] = await Promise.all([
      db.user.findMany({
        where: { active: true, unit: { not: null } },
        select: { id: true, area: true },
      }),
      db.vote.findMany({ where: { pollId: activePoll.id }, select: { voterId: true } }),
    ])
    const areaOf = new Map(owners.map((o) => [o.id, Number(o.area ?? 0)]))
    const total = owners.reduce((s, o) => s + Number(o.area ?? 0), 0)
    const voted = votes.reduce((s, v) => s + (areaOf.get(v.voterId) ?? 0), 0)
    if (total > 0) quorumPct = (voted / total) * 100
  }

  const investment = investments[0]
  const investmentPct = investment
    ? Math.min(100, (Number(investment.spent) / Math.max(1, Number(investment.budget))) * 100)
    : 0

  const daysToInspection = nextInspection?.nextDueDate
    ? Math.round(
        (new Date(nextInspection.nextDueDate).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null

  // Sve sto trazi akciju upravnika — ide iznad brojki, jer brojke ne traze nista.
  const attention: { title: string; detail: string; href: string }[] = []
  if (pendingAccess > 0) {
    attention.push({
      title: `${pendingAccess} ${pendingAccess === 1 ? "захтев" : "захтева"} за приступ`,
      detail: "Чекају одобрење",
      href: "/dashboard/zahtevi-za-pristup",
    })
  }
  if (missingArea > 0) {
    attention.push({
      title: `Квадратура: ${missingArea} ${missingArea === 1 ? "стан" : "станова"}`,
      detail: "Гласање се још рачуна по броју гласова",
      href: "/dashboard/stanari",
    })
  }
  if (urgentRequests > 0) {
    attention.push({
      title: `${urgentRequests} ${urgentRequests === 1 ? "хитан захтев" : "хитна захтева"}`,
      detail: "Пријављени кварови највишег приоритета",
      href: "/dashboard/zahtevi",
    })
  }
  if (daysToInspection !== null && daysToInspection <= 60) {
    attention.push({
      title:
        daysToInspection < 0
          ? "ПП преглед је истекао"
          : `ПП преглед за ${daysToInspection} дана`,
      detail: nextInspection?.title ?? "",
      href: "/dashboard/inspekcije",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {/* sr-Cyrl: datum ide cirilicom, kao i sadrzaj obavestenja. */}
            {now.toLocaleDateString("sr-Cyrl-RS", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1 className="text-2xl sm:text-[27px] font-bold tracking-tight mt-0.5">
            Здраво, {name.split(" ")[0]}
          </h1>
        </div>
        <Link
          href="/dashboard/obavestenja/novo"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Megaphone className="w-4 h-4" />
          Ново обавештење
        </Link>
      </div>

      {attention.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold">Тражи твоју пажњу</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attention.map((a) => (
              <Link
                key={a.title}
                href={a.href}
                className="rounded-lg border border-amber-200/70 bg-card px-3.5 py-2.5 hover:border-amber-300 transition-colors"
              >
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Стање рачуна"
          value={rsd(balance)}
          unit="РСД"
          icon={ArrowLeftRight}
          module="finansije"
          href="/dashboard/finansije"
          hint={`${rsd(Number(monthIncome._sum.amount ?? 0))} РСД уплата овог месеца`}
        />

        <StatCard
          label="Отворени захтеви"
          value={openRequests}
          icon={Wrench}
          module="zahtevi"
          href="/dashboard/zahtevi"
          hint={
            urgentRequests > 0 ? (
              <span className="text-red-700 font-semibold">
                {urgentRequests} {urgentRequests === 1 ? "хитан" : "хитна"}
              </span>
            ) : (
              "Нема хитних"
            )
          }
        />

        <StatCard
          label="Активно гласање"
          value={
            activePoll
              ? quorumPct !== null
                ? `${quorumPct.toFixed(0)}`
                : String(activePoll._count.votes)
              : "—"
          }
          unit={
            activePoll ? (quorumPct !== null ? "% kvoruma" : "glasova") : undefined
          }
          icon={Vote}
          module="glasanje"
          href={activePoll ? `/dashboard/glasanje/${activePoll.id}` : "/dashboard/glasanje"}
          hint={activePoll ? activePoll.title : "Нема активног гласања"}
        />

        <StatCard
          label="Инвестиције у току"
          value={investments.length}
          icon={HardHat}
          module="investicije"
          href="/dashboard/investicije"
        >
          {investment && (
            <div className="space-y-1.5">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${investmentPct}%`,
                    background: moduleAccent.investicije.color,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {investment.title} · {investmentPct.toFixed(0)}% буџета
              </p>
            </div>
          )}
        </StatCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5">
        <div className="rounded-xl border bg-card card-lift overflow-hidden">
          <SectionTitle
            title="Последња обавештења"
            icon={Megaphone}
            module="obavestenja"
            action={
              <Link href="/dashboard/obavestenja" className="text-sm text-muted-foreground hover:text-foreground">
                Сва
              </Link>
            }
          />
          {announcements.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">
              Још нема објављених обавештења.
            </p>
          ) : (
            <ul className="divide-y">
              {announcements.map((a) => (
                <li key={a.id}>
                  <Link href="/dashboard/obavestenja" className="flex gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                    <span
                      className={`w-[3px] rounded-full shrink-0 ${
                        a.priority === "URGENT" ? "bg-red-500" : "bg-border"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        {a.priority === "URGENT" && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-50 px-1.5 rounded">
                            Хитно
                          </span>
                        )}
                        {a.isPinned && <Pin className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-sm font-semibold">{a.title}</span>
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {new Date(a.publishedAt).toLocaleDateString("sr-RS")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card card-lift overflow-hidden">
          <SectionTitle title="Предстоји" icon={CalendarClock} module="kalendar" />
          {upcomingTasks.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">
              Нема заказаних обавеза.
            </p>
          ) : (
            <ul className="divide-y">
              {upcomingTasks.map((t) => {
                const d = new Date(t.dueDate)
                return (
                  <li key={t.id}>
                    <Link href="/dashboard/kalendar" className="flex items-center gap-3.5 px-5 py-3 hover:bg-muted/40 transition-colors">
                      <span className="w-10 shrink-0 text-center">
                        <span className="block text-lg font-bold leading-none nums">
                          {d.getDate()}
                        </span>
                        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                          {MONTHS_SHORT[d.getMonth()]}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold truncate">{t.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {t.recurrence !== "NONE" ? "понавља се" : "једнократно"}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
