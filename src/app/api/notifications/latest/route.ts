import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ latest: null }, { status: 401 })

  const latest = await db.announcement.findFirst({
    where: {
      publishedAt: { lte: new Date() },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, priority: true, publishedAt: true },
  })

  return NextResponse.json({ latest })
}
