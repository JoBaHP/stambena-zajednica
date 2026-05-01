import { google, drive_v3 } from "googleapis"
import { Readable } from "node:stream"

const SCOPES = ["https://www.googleapis.com/auth/drive"]

let cachedDrive: drive_v3.Drive | null = null

function getDrive(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive

  const clientId = process.env.GDRIVE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GDRIVE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GDRIVE_OAUTH_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GDRIVE_OAUTH_CLIENT_ID, GDRIVE_OAUTH_CLIENT_SECRET i GDRIVE_OAUTH_REFRESH_TOKEN moraju biti postavljeni",
    )
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken, scope: SCOPES.join(" ") })

  cachedDrive = google.drive({ version: "v3", auth })
  return cachedDrive
}

export async function findOrCreateFolder(
  name: string,
  parentId: string,
): Promise<string> {
  const drive = getDrive()
  const safeName = name.replace(/'/g, "\\'")
  const query = [
    `'${parentId}' in parents`,
    `name = '${safeName}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ")

  const list = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 1,
  })

  if (list.data.files && list.data.files.length > 0 && list.data.files[0].id) {
    return list.data.files[0].id
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  })

  if (!created.data.id) {
    throw new Error(`Folder ${name} nije mogao biti kreiran`)
  }
  return created.data.id
}

export async function uploadFile(opts: {
  parentFolderId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}): Promise<{ fileId: string }> {
  const drive = getDrive()

  const stream = Readable.from(opts.buffer)
  const res = await drive.files.create({
    requestBody: {
      name: opts.fileName,
      parents: [opts.parentFolderId],
    },
    media: {
      mimeType: opts.mimeType,
      body: stream,
    },
    fields: "id",
    supportsAllDrives: true,
  })

  if (!res.data.id) {
    throw new Error("Upload na Drive nije uspeo")
  }
  return { fileId: res.data.id }
}

export async function downloadFile(
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const drive = getDrive()

  const meta = await drive.files.get({
    fileId,
    fields: "name, mimeType",
    supportsAllDrives: true,
  })

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  )

  return {
    buffer: Buffer.from(res.data as ArrayBuffer),
    mimeType: meta.data.mimeType ?? "application/octet-stream",
    fileName: meta.data.name ?? "file",
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  const drive = getDrive()
  await drive.files.delete({ fileId, supportsAllDrives: true })
}

const MONTH_PREFIX_MAP: Record<string, string> = {
  JAN: "Januar",
  FEB: "Februar",
  MAR: "Mart",
  APR: "April",
  MAJ: "Maj",
  JUN: "Jun",
  JUL: "Jul",
  AVG: "Avgust",
  SEP: "Septembar",
  OKT: "Oktobar",
  NOV: "Novembar",
  DEC: "Decembar",
}

export function parseInvoiceMonth(fileName: string): string | null {
  const match = fileName.toUpperCase().match(/^([A-Z]{3})[_-]/)
  if (!match) return null
  return MONTH_PREFIX_MAP[match[1]] ?? null
}

const CATEGORY_FOLDER_NAMES: Record<string, string> = {
  MINUTES: "Zapisnici",
  CONTRACT: "Ugovori",
  REPORT: "Izvestaji",
  REGULATION: "Pravilnici",
  OTHER: "Ostalo",
}

export function categoryFolderName(category: string): string {
  return CATEGORY_FOLDER_NAMES[category] ?? "Ostalo"
}

export async function resolveTargetFolder(opts: {
  category: string
  year: number
  fileName: string
}): Promise<{ folderId: string; missingMonthFallback: boolean }> {
  if (opts.category === "INVOICE") {
    const invoicesRoot = process.env.GDRIVE_INVOICES_FOLDER_ID
    if (!invoicesRoot) {
      throw new Error("GDRIVE_INVOICES_FOLDER_ID nije postavljen")
    }
    const yearFolderId = await findOrCreateFolder(String(opts.year), invoicesRoot)
    const month = parseInvoiceMonth(opts.fileName)
    if (!month) {
      return { folderId: yearFolderId, missingMonthFallback: true }
    }
    const monthFolderId = await findOrCreateFolder(month, yearFolderId)
    return { folderId: monthFolderId, missingMonthFallback: false }
  }

  const archiveRoot = process.env.GDRIVE_ARCHIVE_FOLDER_ID
  if (!archiveRoot) {
    throw new Error("GDRIVE_ARCHIVE_FOLDER_ID nije postavljen")
  }
  const categoryFolderId = await findOrCreateFolder(
    categoryFolderName(opts.category),
    archiveRoot,
  )
  const yearFolderId = await findOrCreateFolder(
    String(opts.year),
    categoryFolderId,
  )
  return { folderId: yearFolderId, missingMonthFallback: false }
}
