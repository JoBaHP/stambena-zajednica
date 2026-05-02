"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { notifyManagers, sendDirectEmail } from "@/lib/notifications"

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export async function createAccessRequest(formData: FormData) {
  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const phone = (formData.get("phone") as string)?.trim() || null
  const unit = (formData.get("unit") as string)?.trim() || null
  const message = (formData.get("message") as string)?.trim() || null

  if (!name || !email) {
    return { error: "Ime i email su obavezni" }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Email format nije validan" }
  }

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return {
      error:
        "Vec postoji nalog sa ovim email-om. Probaj prijavu ili reset lozinke.",
    }
  }

  const existingPending = await db.accessRequest.findFirst({
    where: { email, status: "PENDING" },
  })
  if (existingPending) {
    return {
      error:
        "Vec postoji zahtev za ovaj email koji ceka odobrenje upravnika.",
    }
  }

  let unitOccupant: { name: string; email: string } | null = null
  if (unit) {
    const occupant = await db.user.findFirst({
      where: { unit, active: true },
      select: { name: true, email: true },
    })
    if (occupant) unitOccupant = occupant
  }

  await db.accessRequest.create({
    data: { name, email, phone, unit, message },
  })

  const unitNote = unit ? `\nStan: ${unit}` : ""
  const phoneNote = phone ? `\nTelefon: ${phone}` : ""
  const messageNote = message ? `\nPoruka: ${message}` : ""
  const occupantNote = unitOccupant
    ? `\n\nUPOZORENJE: Stan ${unit} vec ima aktivnog korisnika: ${unitOccupant.name} (${unitOccupant.email}). Proveri pre odobrenja.`
    : ""

  await notifyManagers({
    subject: "Novi zahtev za pristup",
    body: `${name} (${email}) je zatrazio pristup portalu.${unitNote}${phoneNote}${messageNote}${occupantNote}\n\nPregledaj zahtev: ${APP_URL}/dashboard/zahtevi-za-pristup`,
  })

  return {
    success: true,
    unitOccupied: !!unitOccupant,
    unit: unit ?? null,
  }
}

export async function approveAccessRequest(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const req = await db.accessRequest.findUnique({ where: { id } })
  if (!req) throw new Error("Zahtev ne postoji")
  if (req.status !== "PENDING") {
    throw new Error("Zahtev je vec obradjen")
  }

  const password = (formData.get("password") as string)?.trim()
  if (!password || password.length < 6) {
    throw new Error("Lozinka mora imati najmanje 6 karaktera")
  }

  const existing = await db.user.findUnique({ where: { email: req.email } })
  if (existing) {
    throw new Error(
      "Korisnik sa ovim email-om vec postoji u sistemu. Odbij zahtev.",
    )
  }

  const hashed = await bcrypt.hash(password, 12)

  await db.$transaction([
    db.user.create({
      data: {
        name: req.name,
        email: req.email,
        phone: req.phone,
        unit: req.unit,
        password: hashed,
        role: "RESIDENT",
      },
    }),
    db.accessRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    }),
  ])

  await sendDirectEmail(
    req.email,
    "Pristup odobren — Pasterova 16",
    `Postovani ${req.name},\n\nVas zahtev za pristup portalu je odobren.\n\nPodaci za prijavu:\nEmail: ${req.email}\nLozinka: ${password}\n\nPrijavi se: ${APP_URL}/login\n\nPreporucujemo da promenis lozinku nakon prve prijave (Podesavanja → Lozinka).`,
  )

  revalidatePath("/dashboard/zahtevi-za-pristup")
  revalidatePath("/dashboard/stanari")
}

export async function rejectAccessRequest(id: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Nemate dozvolu")
  }

  const req = await db.accessRequest.findUnique({ where: { id } })
  if (!req) throw new Error("Zahtev ne postoji")
  if (req.status !== "PENDING") {
    throw new Error("Zahtev je vec obradjen")
  }

  const note = (formData.get("note") as string)?.trim() || null

  await db.accessRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewNote: note,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  })

  const noteLine = note ? `\n\nNapomena upravnika: ${note}` : ""
  await sendDirectEmail(
    req.email,
    "Zahtev za pristup odbijen — Pasterova 16",
    `Postovani ${req.name},\n\nVas zahtev za pristup portalu je odbijen.${noteLine}\n\nAko mislite da je doslo do greske, kontaktirajte upravnika.`,
  )

  revalidatePath("/dashboard/zahtevi-za-pristup")
}
