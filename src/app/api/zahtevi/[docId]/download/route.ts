import { auth } from "@/auth"
import { db } from "@/lib/db"
import { downloadFile } from "@/lib/drive"
import { NextResponse } from "next/server"

// Fotografije uz zahtev vidi svako ko je prijavljen — zahtevi su ionako vidljivi
// celoj zajednici. Prikazuju se inline (img tag), pa nema Content-Disposition.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ docId: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Нисте пријављени" }, { status: 401 })
  }

  const { docId } = await params
  const doc = await db.document.findUnique({ where: { id: docId } })
  if (!doc?.fileId || !doc.requestId) {
    return NextResponse.json({ error: "Прилог не постоји" }, { status: 404 })
  }

  try {
    const { buffer, mimeType } = await downloadFile(doc.fileId)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[zahtev foto]", err)
    return NextResponse.json({ error: "Грешка при преузимању" }, { status: 500 })
  }
}
