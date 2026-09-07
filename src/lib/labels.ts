// Tekstualne oznake enum-a na srpskom. Isti tekst koji stranice prikazuju, da se
// dokumenti na Drive-u citaju identicno kao aplikacija.

export const roleLabels: Record<string, string> = {
  MANAGER: "Управник",
  RESIDENT: "Станар",
}

export const transactionTypeLabels: Record<string, string> = {
  INCOME: "Уплата",
  EXPENSE: "Расход",
}

export const categoryTypeLabels: Record<string, string> = {
  INCOME: "Приход",
  EXPENSE: "Расход",
}

export const inspectionResultLabels: Record<string, string> = {
  PASSED: "Прошло",
  FAILED: "Није прошло",
  CONDITIONAL: "Условно",
}

export const investmentStatusLabels: Record<string, string> = {
  PLANNED: "Планирано",
  IN_PROGRESS: "У току",
  COMPLETED: "Завршено",
  CANCELLED: "Отказано",
}

export const requestCategoryLabels: Record<string, string> = {
  PLUMBING: "Водовод",
  ELECTRICAL: "Електрика",
  ELEVATOR: "Лифт",
  HEATING: "Грејање",
  CLEANING: "Чишћење",
  STRUCTURAL: "Грађевински",
  OTHER: "Остало",
}

export const requestStatusLabels: Record<string, string> = {
  SUBMITTED: "Пријављено",
  IN_PROGRESS: "У току",
  RESOLVED: "Решено",
  REJECTED: "Одбијено",
}

export const requestPriorityLabels: Record<string, string> = {
  LOW: "Низак",
  NORMAL: "Нормалан",
  HIGH: "Висок",
  URGENT: "Хитно",
}

export const taskCategoryLabels: Record<string, string> = {
  INSPECTION: "Инспекција",
  MAINTENANCE: "Одржавање",
  PAYMENT: "Плаћање",
  MEETING: "Састанак",
  CONTRACT: "Уговор",
  OTHER: "Остало",
}

export const taskStatusLabels: Record<string, string> = {
  PENDING: "На чекању",
  COMPLETED: "Завршено",
}

export const taskRecurrenceLabels: Record<string, string> = {
  NONE: "Без понављања",
  MONTHLY: "Месечно",
  QUARTERLY: "Квартално",
  YEARLY: "Годишње",
}

export const contactCategoryLabels: Record<string, string> = {
  EMERGENCY: "Хитне службе",
  MANAGEMENT: "Управа",
  MAINTENANCE: "Одржавање",
}

export const priorityLabels: Record<string, string> = {
  NORMAL: "Нормално",
  URGENT: "Хитно",
}

export const pollStatusLabels: Record<string, string> = {
  DRAFT: "Припрема",
  ACTIVE: "У току",
  CLOSED: "Затворено",
}

export const tenderStatusLabels: Record<string, string> = {
  OPEN: "Отворен",
  CLOSED: "Затворен",
}

export function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return ""
  return map[key] ?? key
}
