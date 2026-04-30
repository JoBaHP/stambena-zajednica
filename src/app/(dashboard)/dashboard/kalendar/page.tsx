import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus,
  CalendarClock,
  CheckCircle2,
  Pencil,
  RotateCcw,
  ShieldCheck,
  HardHat,
  Wallet,
  Users,
  FileText,
  Circle,
} from "lucide-react"
import Link from "next/link"
import { completeTask, reopenTask, deleteTask } from "@/server/actions/kalendar"
import { ConfirmDelete } from "@/components/confirm-delete"

const categoryConfig = {
  INSPECTION: { label: "Inspekcija", icon: ShieldCheck, color: "text-blue-600" },
  MAINTENANCE: { label: "Odrzavanje", icon: HardHat, color: "text-amber-600" },
  PAYMENT: { label: "Placanje", icon: Wallet, color: "text-emerald-600" },
  MEETING: { label: "Sastanak", icon: Users, color: "text-purple-600" },
  CONTRACT: { label: "Ugovor", icon: FileText, color: "text-slate-600" },
  OTHER: { label: "Ostalo", icon: Circle, color: "text-slate-500" },
}

const recurrenceLabels: Record<string, string> = {
  NONE: "",
  MONTHLY: "Mesecno",
  QUARTERLY: "Kvartalno",
  YEARLY: "Godisnje",
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysBetween(a: Date, b: Date) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function formatDate(d: Date) {
  return d.toLocaleDateString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default async function KalendarPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")
  const isManager = true

  const today = startOfDay(new Date())
  const allTasks = await db.task.findMany({
    orderBy: { dueDate: "asc" },
    include: { createdBy: { select: { name: true } } },
  })

  const overdue = allTasks.filter(
    (t) => t.status === "PENDING" && startOfDay(t.dueDate) < today,
  )
  const upcoming = allTasks.filter(
    (t) => t.status === "PENDING" && startOfDay(t.dueDate) >= today,
  )
  const completed = allTasks
    .filter((t) => t.status === "COMPLETED")
    .sort((a, b) => {
      const at = a.completedAt?.getTime() ?? 0
      const bt = b.completedAt?.getTime() ?? 0
      return bt - at
    })
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kalendar obaveza</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pregled obaveza, rokova i zakazanih aktivnosti
          </p>
        </div>
        {isManager && (
          <Button render={<Link href="/dashboard/kalendar/novi" />}>
            <Plus className="w-4 h-4 mr-2" />
            Nova obaveza
          </Button>
        )}
      </div>

      {allTasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarClock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nema unetih obaveza</p>
            {isManager && (
              <Button
                className="mt-4"
                variant="outline"
                render={<Link href="/dashboard/kalendar/novi" />}
              >
                Dodaj prvu obavezu
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <TaskSection
              title={`Dospelo (${overdue.length})`}
              tasks={overdue}
              today={today}
              isManager={isManager}
              tone="overdue"
            />
          )}

          <TaskSection
            title={`Predstojece (${upcoming.length})`}
            tasks={upcoming}
            today={today}
            isManager={isManager}
            tone="upcoming"
            emptyText="Nema predstojecih obaveza"
          />

          {completed.length > 0 && (
            <TaskSection
              title="Zavrseno"
              tasks={completed}
              today={today}
              isManager={isManager}
              tone="completed"
            />
          )}
        </div>
      )}
    </div>
  )
}

type TaskItem = {
  id: string
  title: string
  description: string | null
  dueDate: Date
  category: keyof typeof categoryConfig
  status: "PENDING" | "COMPLETED"
  recurrence: "NONE" | "MONTHLY" | "QUARTERLY" | "YEARLY"
  completedAt: Date | null
}

function TaskSection({
  title,
  tasks,
  today,
  isManager,
  tone,
  emptyText,
}: {
  title: string
  tasks: TaskItem[]
  today: Date
  isManager: boolean
  tone: "overdue" | "upcoming" | "completed"
  emptyText?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle
          className={`text-base ${
            tone === "overdue"
              ? "text-red-600"
              : tone === "completed"
                ? "text-muted-foreground"
                : ""
          }`}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {emptyText ?? "Nema obaveza"}
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                today={today}
                isManager={isManager}
                tone={tone}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TaskRow({
  task,
  today,
  isManager,
  tone,
}: {
  task: TaskItem
  today: Date
  isManager: boolean
  tone: "overdue" | "upcoming" | "completed"
}) {
  const cfg = categoryConfig[task.category]
  const Icon = cfg.icon
  const diff = daysBetween(today, task.dueDate)

  const dateLabel =
    tone === "completed"
      ? task.completedAt
        ? `Zavrseno ${formatDate(task.completedAt)}`
        : formatDate(task.dueDate)
      : diff === 0
        ? "Danas"
        : diff === 1
          ? "Sutra"
          : diff === -1
            ? "Juce"
            : diff > 1
              ? `Za ${diff} dana · ${formatDate(task.dueDate)}`
              : `Pre ${Math.abs(diff)} dana · ${formatDate(task.dueDate)}`

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        tone === "overdue" ? "border-red-200 bg-red-50/50" : ""
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className={`font-medium ${
              tone === "completed" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </h3>
          <Badge variant="outline" className="text-xs">
            {cfg.label}
          </Badge>
          {task.recurrence !== "NONE" && (
            <Badge variant="outline" className="text-xs">
              {recurrenceLabels[task.recurrence]}
            </Badge>
          )}
        </div>
        {task.description && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
            {task.description}
          </p>
        )}
        <p
          className={`text-xs mt-1 ${
            tone === "overdue" ? "text-red-600 font-medium" : "text-muted-foreground"
          }`}
        >
          {dateLabel}
        </p>
      </div>
      {isManager && (
        <div className="flex items-center gap-1 shrink-0">
          {tone === "completed" ? (
            <form action={reopenTask.bind(null, task.id)}>
              <Button variant="ghost" size="sm" type="submit" title="Vrati u obaveze">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form action={completeTask.bind(null, task.id)}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                title="Oznaci zavrseno"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </Button>
            </form>
          )}
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/dashboard/kalendar/${task.id}/uredi`} />}
            title="Uredi"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <ConfirmDelete
            action={deleteTask.bind(null, task.id)}
            label=""
            confirmLabel="Obrisi?"
          />
        </div>
      )}
    </div>
  )
}
