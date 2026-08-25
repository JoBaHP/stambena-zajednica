// Tekstualne oznake enum-a na srpskom. Isti tekst koji stranice prikazuju, da se
// dokumenti na Drive-u citaju identicno kao aplikacija.

export const roleLabels: Record<string, string> = {
  MANAGER: "Upravnik",
  RESIDENT: "Stanar",
}

export const transactionTypeLabels: Record<string, string> = {
  INCOME: "Uplata",
  EXPENSE: "Rashod",
}

export const categoryTypeLabels: Record<string, string> = {
  INCOME: "Prihod",
  EXPENSE: "Rashod",
}

export const inspectionResultLabels: Record<string, string> = {
  PASSED: "Proslo",
  FAILED: "Nije proslo",
  CONDITIONAL: "Uslovno",
}

export const investmentStatusLabels: Record<string, string> = {
  PLANNED: "Planirano",
  IN_PROGRESS: "U toku",
  COMPLETED: "Zavrseno",
  CANCELLED: "Otkazano",
}

export const requestCategoryLabels: Record<string, string> = {
  PLUMBING: "Vodovod",
  ELECTRICAL: "Elektrika",
  ELEVATOR: "Lift",
  HEATING: "Grejanje",
  CLEANING: "Ciscenje",
  STRUCTURAL: "Gradjevinski",
  OTHER: "Ostalo",
}

export const requestStatusLabels: Record<string, string> = {
  SUBMITTED: "Prijavljeno",
  IN_PROGRESS: "U toku",
  RESOLVED: "Reseno",
  REJECTED: "Odbijeno",
}

export const requestPriorityLabels: Record<string, string> = {
  LOW: "Nizak",
  NORMAL: "Normalan",
  HIGH: "Visok",
  URGENT: "Hitno",
}

export const taskCategoryLabels: Record<string, string> = {
  INSPECTION: "Inspekcija",
  MAINTENANCE: "Odrzavanje",
  PAYMENT: "Placanje",
  MEETING: "Sastanak",
  CONTRACT: "Ugovor",
  OTHER: "Ostalo",
}

export const taskStatusLabels: Record<string, string> = {
  PENDING: "Na cekanju",
  COMPLETED: "Zavrseno",
}

export const taskRecurrenceLabels: Record<string, string> = {
  NONE: "Bez ponavljanja",
  MONTHLY: "Mesecno",
  QUARTERLY: "Kvartalno",
  YEARLY: "Godisnje",
}

export const contactCategoryLabels: Record<string, string> = {
  EMERGENCY: "Hitne sluzbe",
  MANAGEMENT: "Uprava",
  MAINTENANCE: "Odrzavanje",
}

export const priorityLabels: Record<string, string> = {
  NORMAL: "Normalno",
  URGENT: "Hitno",
}

export const pollStatusLabels: Record<string, string> = {
  DRAFT: "Priprema",
  ACTIVE: "U toku",
  CLOSED: "Zatvoreno",
}

export const tenderStatusLabels: Record<string, string> = {
  OPEN: "Otvoren",
  CLOSED: "Zatvoren",
}

export function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return ""
  return map[key] ?? key
}
