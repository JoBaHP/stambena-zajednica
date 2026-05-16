import { auth } from "@/auth"
import { db } from "@/lib/db"
import { downloadFile } from "@/lib/drive"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const session = await auth()
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { offerId } = await params
  const offer = await db.tenderOffer.findUnique({ where: { id: offerId } })
  if (!offer?.fileId) return new NextResponse("Not found", { status: 404 })

  try {
    const { buffer, mimeType, fileName } = await downloadFile(offer.fileId)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch {
    return new NextResponse("Download failed", { status: 500 })
  }
}
