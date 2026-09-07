import nodemailer from "nodemailer"
import { db } from "@/lib/db"

type NotifyOptions = {
  subject: string
  body: string
}

function getTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  })
}

export async function sendDirectEmail(to: string, subject: string, body: string) {
  return sendEmail(to, subject, body)
}

async function sendEmail(to: string, subject: string, body: string) {
  const transporter = getTransporter()
  if (!transporter) {
    console.log(`[email skipped — GMAIL_USER/GMAIL_APP_PASSWORD nisu postavljeni] to=${to} subject="${subject}"`)
    return
  }

  const from = `Pasterova 16 <${process.env.GMAIL_USER}>`
  try {
    await transporter.sendMail({ from, to, subject, text: body })
  } catch (err) {
    console.error(`[email failed] to=${to}`, err)
  }
}

export async function notifyUsers(userIds: string[], opts: NotifyOptions) {
  if (userIds.length === 0) return

  const users = await db.user.findMany({
    // active: true — korisniku sa uklonjenim pristupom ne salju se obavestenja.
    // Filter je ovde jer notifyAllResidents i notifyManagers prolaze kroz ovu
    // funkciju, pa jedno mesto pokriva sve pozive.
    where: { id: { in: userIds }, active: true },
    select: { id: true, email: true, notifyEmail: true },
  })

  const tasks: Promise<void>[] = []
  for (const u of users) {
    if (u.notifyEmail && u.email) {
      tasks.push(sendEmail(u.email, opts.subject, opts.body))
    }
  }

  await Promise.allSettled(tasks)
}

export async function notifyAllResidents(opts: NotifyOptions) {
  const residents = await db.user.findMany({
    where: { OR: [{ role: "RESIDENT" }, { role: "MANAGER", unit: { not: null } }] },
    select: { id: true },
  })
  await notifyUsers(
    residents.map((r) => r.id),
    opts,
  )
}

export async function notifyManagers(opts: NotifyOptions) {
  const managers = await db.user.findMany({
    where: { role: "MANAGER" },
    select: { id: true },
  })
  await notifyUsers(
    managers.map((m) => m.id),
    opts,
  )
}
