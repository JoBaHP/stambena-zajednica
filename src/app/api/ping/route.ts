import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 })

  await db.user.update({
    where: { id: session.user.id },
    data: { lastSeenAt: new Date() },
  })

  return NextResponse.json(null, { status: 204 })
}
