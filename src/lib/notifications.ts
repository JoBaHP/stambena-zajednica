import { Resend } from "resend"
import { db } from "@/lib/db"

type NotifyOptions = {
  subject: string
  body: string
  smsBody?: string
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? "Pasterova 16 <noreply@pasterova16.rs>"

async function sendEmail(to: string, subject: string, body: string) {
  if (!resend) {
    console.log(`[email skipped — no RESEND_API_KEY] to=${to} subject="${subject}"`)
    return
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text: body,
    })
  } catch (err) {
    console.error(`[email failed] to=${to}`, err)
  }
}

async function sendSms(phone: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    console.log(`[sms skipped — twilio env vars missing] to=${phone}`)
    return
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: from,
          To: phone,
          Body: body,
        }),
      },
    )

    if (!res.ok) {
      const text = await res.text()
      console.error(`[sms failed] to=${phone} status=${res.status} ${text}`)
    }
  } catch (err) {
    console.error(`[sms failed] to=${phone}`, err)
  }
}

export async function notifyUsers(userIds: string[], opts: NotifyOptions) {
  if (userIds.length === 0) return

  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      phone: true,
      notifyEmail: true,
      notifySms: true,
    },
  })

  const tasks: Promise<void>[] = []
  for (const u of users) {
    if (u.notifyEmail && u.email) {
      tasks.push(sendEmail(u.email, opts.subject, opts.body))
    }
    if (u.notifySms && u.phone) {
      tasks.push(sendSms(u.phone, opts.smsBody ?? opts.body))
    }
  }

  await Promise.allSettled(tasks)
}

export async function notifyAllResidents(opts: NotifyOptions) {
  const residents = await db.user.findMany({
    where: { role: "RESIDENT" },
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
