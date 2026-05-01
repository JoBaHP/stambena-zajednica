import { auth } from "@/auth"
import { db } from "@/lib/db"
import { downloadFile } from "@/lib/drive"
import { NextResponse } from "next/server"

const RESIDENT_VISIBLE = ["MINUTES", "REGULATION", "OTHER"]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 })
  }

  const { id } = await params
  const doc = await db.archiveDocument.findUnique({ where: { id } })
  if (!doc) {
    return NextResponse.json({ error: "Dokument ne postoji" }, { status: 404 })
  }

  if (
    session.user.role !== "MANAGER" &&
    !RESIDENT_VISIBLE.includes(doc.category)
  ) {
    return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 })
  }

  try {
    const { buffer, mimeType, fileName } = await downloadFile(doc.fileId)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (err) {
    console.error("[arhiva download]", err)
    return NextResponse.json(
      { error: "Greska pri preuzimanju" },
      { status: 500 },
    )
  }
}
