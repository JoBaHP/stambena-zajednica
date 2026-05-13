import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { google } from "googleapis"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const clientId = process.env.GDRIVE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GDRIVE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GDRIVE_OAUTH_REFRESH_TOKEN
  const archiveFolderId = process.env.GDRIVE_ARCHIVE_FOLDER_ID
  const invoicesFolderId = process.env.GDRIVE_INVOICES_FOLDER_ID

  const envCheck = {
    GDRIVE_OAUTH_CLIENT_ID: clientId ? "set" : "MISSING",
    GDRIVE_OAUTH_CLIENT_SECRET: clientSecret ? "set" : "MISSING",
    GDRIVE_OAUTH_REFRESH_TOKEN: refreshToken ? "set" : "MISSING",
    GDRIVE_ARCHIVE_FOLDER_ID: archiveFolderId ?? "MISSING",
    GDRIVE_INVOICES_FOLDER_ID: invoicesFolderId ?? "MISSING",
  }

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ envCheck, error: "Env vars missing" })
  }

  try {
    const oAuth2 = new google.auth.OAuth2(clientId, clientSecret)
    oAuth2.setCredentials({ refresh_token: refreshToken })
    const drive = google.drive({ version: "v3", auth: oAuth2 })

    // Try to get a fresh access token first
    const { token } = await oAuth2.getAccessToken()
    const tokenOk = !!token

    // Try to list files in the archive root folder
    let folderTest: { ok: boolean; error?: string } = { ok: false }
    if (archiveFolderId) {
      try {
        await drive.files.list({
          q: `'${archiveFolderId}' in parents and trashed = false`,
          fields: "files(id, name)",
          pageSize: 1,
        })
        folderTest = { ok: true }
      } catch (e) {
        const err = e as { code?: number; message?: string; errors?: unknown[] }
        folderTest = {
          ok: false,
          error: `code=${err.code} message=${err.message}`,
        }
      }
    }

    return NextResponse.json({ envCheck, tokenOk, folderTest })
  } catch (e) {
    const err = e as { code?: number; message?: string }
    return NextResponse.json({
      envCheck,
      error: `${err.code ?? ""} ${err.message ?? String(e)}`,
    })
  }
}
