import Link from "next/link"
import { db } from "@/lib/db"
import { StatCard, SectionTitle } from "@/components/stat-card"
import { requestStatusLabels, label as enumLabel } from "@/lib/labels"
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  Megaphone,
  Vote,
  Wrench,
} from "lucide-react"

function rsd(value: number): string {
  return Math.round(value).toLocaleString("sr-RS")
}

/**
 * Stanar ne vidi iste kartice kao upravnik. Prvo ide ono sto ga se tice
 * odmah — hitno obavestenje i glasanje koje ceka — pa tek onda brojke.
 */
export async function ResidentDashboard({
  userId,
  name,
}: {
  userId: string
  name: string
}) {
  const now = new Date()

  const [me, income, expense, announcements, activePoll, myRequest, owners] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { unit: true, area: true },
      }),
      db.transaction.aggregate({ where: { type: "INCOME" }, _sum: { amount: true } }),
      db.transaction.aggregate({ where: { type: "EXPENSE" }, _sum: { amount: true } }),
      db.announcement.findMany({
        where: {
          publishedAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        take: 4,
        select: { id: true, title: true, body: true, priority: true, publishedAt: true },
      }),
      db.poll.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, endsAt: true },
      }),
      db.maintenanceRequest.findFirst({
        where: { reporterId: userId, status: { in: ["SUBMITTED", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, createdAt: true },
      }),
      db.user.findMany({
        where: { active: true, unit: { not: null } },
        select: { area: true },
      }),
    ])

  const balance = Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0)
  const myArea = Number(me?.area ?? 0)
  const totalArea = owners.reduce((s, o) => s + Number(o.area ?? 0), 0)
  const sharePct = myArea > 0 && totalArea > 0 ? (myArea / totalArea) * 100 : null

  const [lead, ...rest] = announcements
  const myVote = activePoll
    ? await db.vote.findUnique({
        where: { pollId_voterId: { pollId: activePoll.id, voterId: userId } },
        select: { id: true },
      })
    : null

  return (
    <div className="space-y-6">
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
          Добар дан, {name.split(" ")[0]}
        </h1>
        {me?.unit && (
          <p className="text-sm text-muted-foreground">
            Stan {me.unit}
            {myArea > 0 && ` · ${myArea.toLocaleString("sr-RS")} m²`}
          </p>
        )}
      </div>

      {lead && (
        <div
          className={`rounded-xl border p-4 sm:p-5 flex gap-4 ${
            lead.priority === "URGENT"
              ? "border-red-200 bg-red-50/50"
              : "border-border bg-card"
          }`}
        >
          <span
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
              lead.priority === "URGENT" ? "bg-red-100" : "bg-muted"
            }`}
          >
            {lead.priority === "URGENT" ? (
              <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
            ) : (
              <Megaphone className="w-4.5 h-4.5 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {lead.priority === "URGENT" && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 rounded">
                  Хитно
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(lead.publishedAt).toLocaleDateString("sr-RS")}
              </span>
            </div>
            <h2 className="text-base font-bold mt-1">{lead.title}</h2>
            <p className="text-sm text-foreground/80 mt-1 line-clamp-3 whitespace-pre-wrap">
              {lead.body}
            </p>
            <Link
              href="/dashboard/obavestenja"
              className="inline-block text-sm font-semibold text-primary mt-2"
            >
              Сва обавештења
            </Link>
          </div>
        </div>
      )}

      {activePoll && !myVote && (
        <Link
          href={`/dashboard/glasanje/${activePoll.id}`}
          className="card-lift rounded-xl border bg-card p-4 sm:p-5 flex items-center gap-4"
        >
          <span
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--m-glasanje-tint)" }}
          >
            <Vote className="w-4.5 h-4.5" style={{ color: "var(--m-glasanje)" }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold truncate">
              Нисте гласали: {activePoll.title}
            </span>
            <span className="block text-sm text-muted-foreground">
              {activePoll.endsAt
                ? `Истиче ${new Date(activePoll.endsAt).toLocaleDateString("sr-RS")}`
                : "Гласање је отворено"}
            </span>
          </span>
          <span className="shrink-0 inline-flex items-center h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            Гласај
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Стање рачуна заједнице"
          value={rsd(balance)}
          unit="РСД"
          icon={ArrowLeftRight}
          module="finansije"
          href="/dashboard/finansije"
          hint="Види на шта је потрошено"
        />

        <StatCard
          label="Ваш власнички удео"
          value={sharePct !== null ? `${sharePct.toFixed(1).replace(".", ",")}%` : "—"}
          icon={Building2}
          module="stanari"
          hint={
            sharePct !== null
              ? `${myArea.toLocaleString("sr-RS")} m² од укупно ${totalArea.toLocaleString("sr-RS")} m²`
              : "Квадратура још није унета"
          }
        />

        <StatCard
          label="Ваш захтев"
          value={
            myRequest ? (
              <span className="text-base font-bold leading-snug line-clamp-2">
                {myRequest.title}
              </span>
            ) : (
              "—"
            )
          }
          icon={Wrench}
          module="zahtevi"
          href={myRequest ? `/dashboard/zahtevi/${myRequest.id}` : "/dashboard/zahtevi/novi"}
          hint={
            myRequest
              ? `${enumLabel(requestStatusLabels, myRequest.status)} · od ${new Date(myRequest.createdAt).toLocaleDateString("sr-RS")}`
              : "Немате отворених захтева"
          }
        />
      </div>

      {rest.length > 0 && (
        <div className="rounded-xl border bg-card card-lift overflow-hidden">
          <SectionTitle
            title="Ранија обавештења"
            icon={Megaphone}
            module="obavestenja"
            action={
              <Link href="/dashboard/obavestenja" className="text-sm text-muted-foreground hover:text-foreground">
                Сва
              </Link>
            }
          />
          <ul className="divide-y">
            {rest.map((a) => (
              <li key={a.id}>
                <Link
                  href="/dashboard/obavestenja"
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-sm truncate">{a.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 nums">
                    {new Date(a.publishedAt).toLocaleDateString("sr-RS")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
