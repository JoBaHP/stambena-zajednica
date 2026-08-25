// Automatsko ogledanje zapisa iz baze u citljive dokumente na Google Drive.
//
// Baza ostaje izvor istine; Drive je citljiva arhiva koja se pise sama.
// Greska na Drive-u nikada ne prekida akciju korisnika — upisuje se u
// DriveMirror.lastError i vidi se na /dashboard/podesavanja.

import { createHash } from "node:crypto"
import { db } from "@/lib/db"
import {
  findFileInFolder,
  findOrCreateFolder,
  forgetFolder,
  updateFile,
  uploadFile,
} from "@/lib/drive"
import {
  MIRROR_ENTITIES,
  REGISTRY_ID,
  mirrorDef,
  type BuiltDocument,
  type MirrorEntity,
} from "./registry"
import {
  DATA_ENTITIES,
  DATA_FOLDER,
  DATA_ID,
  buildDataSnapshot,
  dataDump,
  type DataEntity,
} from "./data"

export { MIRROR_ENTITIES, REGISTRY_ID, type MirrorEntity } from "./registry"
export { DATA_ENTITIES, DATA_FOLDER, DATA_ID, type DataEntity } from "./data"

const DEFAULT_MIME = "text/plain"

export type MirrorResult = "synced" | "unchanged" | "skipped" | "failed"

export function mirrorEnabled(): boolean {
  if (process.env.DRIVE_MIRROR_DISABLED === "1") return false
  return Boolean(
    process.env.GDRIVE_ARCHIVE_FOLDER_ID &&
      process.env.GDRIVE_OAUTH_CLIENT_ID &&
      process.env.GDRIVE_OAUTH_CLIENT_SECRET &&
      process.env.GDRIVE_OAUTH_REFRESH_TOKEN,
  )
}

function errorCode(err: unknown): number | undefined {
  return (err as { code?: number })?.code
}

async function resolveFolder(path: string[]): Promise<string> {
  const root = process.env.GDRIVE_ARCHIVE_FOLDER_ID
  if (!root) throw new Error("GDRIVE_ARCHIVE_FOLDER_ID nije postavljen")

  let parent = root
  for (const segment of path) {
    parent = await findOrCreateFolder(segment, parent)
  }
  return parent
}

async function writeDocument(
  doc: BuiltDocument,
  knownFileId: string | null,
): Promise<{ fileId: string; folderId: string }> {
  const buffer = Buffer.from(doc.content, "utf8")
  const mimeType = doc.mimeType ?? DEFAULT_MIME

  if (knownFileId) {
    try {
      await updateFile({
        fileId: knownFileId,
        fileName: doc.fileName,
        mimeType,
        buffer,
      })
      const folderId = await resolveFolder(doc.folderPath)
      return { fileId: knownFileId, folderId }
    } catch (err) {
      // Fajl rucno obrisan na Drive-u — pravimo ga iznova.
      if (errorCode(err) !== 404) throw err
    }
  }

  let folderId = await resolveFolder(doc.folderPath)

  const upload = async (parentFolderId: string) => {
    const existing = await findFileInFolder(doc.fileName, parentFolderId)
    if (existing) {
      await updateFile({
        fileId: existing,
        fileName: doc.fileName,
        mimeType,
        buffer,
      })
      return existing
    }
    const { fileId } = await uploadFile({
      parentFolderId,
      fileName: doc.fileName,
      mimeType,
      buffer,
    })
    return fileId
  }

  try {
    return { fileId: await upload(folderId), folderId }
  } catch (err) {
    if (errorCode(err) !== 404) throw err
    // Kesirani folder je obrisan — zaboravi ga i razresi putanju iznova.
    const last = doc.folderPath[doc.folderPath.length - 1]
    if (last) {
      const parentPath = doc.folderPath.slice(0, -1)
      const parentId = await resolveFolder(parentPath)
      forgetFolder(last, parentId)
    }
    folderId = await resolveFolder(doc.folderPath)
    return { fileId: await upload(folderId), folderId }
  }
}

/** Nikada ne baca izuzetak — greska ide u log i u DriveMirror.lastError. */
async function mirrorWith(
  entity: string,
  entityId: string,
  build: () => Promise<BuiltDocument | null>,
): Promise<MirrorResult> {
  if (!mirrorEnabled()) return "skipped"

  try {
    const doc = await build()
    if (!doc) return "skipped" // zapis obrisan — fajl na Drive-u ostaje netaknut

    // Ime fajla ulazi u hes: promena naslova mora da preimenuje fajl na Drive-u.
    const contentHash = createHash("sha256")
      .update(`${doc.folderPath.join("/")}/${doc.fileName}\n`)
      .update(doc.hashSource ?? doc.content)
      .digest("hex")
    const existing = await db.driveMirror.findUnique({
      where: { entity_entityId: { entity, entityId } },
    })

    if (existing?.fileId && existing.contentHash === contentHash) {
      await db.driveMirror.update({
        where: { id: existing.id },
        data: { syncedAt: new Date(), lastError: null, attempts: 0 },
      })
      return "unchanged"
    }

    const { fileId, folderId } = await writeDocument(
      doc,
      existing?.fileId ?? null,
    )

    await db.driveMirror.upsert({
      where: { entity_entityId: { entity, entityId } },
      create: {
        entity,
        entityId,
        fileId,
        fileName: doc.fileName,
        folderId,
        contentHash,
        syncedAt: new Date(),
      },
      update: {
        fileId,
        fileName: doc.fileName,
        folderId,
        contentHash,
        syncedAt: new Date(),
        lastError: null,
        attempts: 0,
      },
    })

    return "synced"
  } catch (err) {
    const gErr = err as { code?: number; errors?: unknown[] }
    const message = err instanceof Error ? err.message : String(err)
    console.error("[driveMirror] upis nije uspeo", {
      entity,
      entityId,
      message,
      code: gErr?.code,
      errors: gErr?.errors,
      stack: err instanceof Error ? err.stack : undefined,
    })

    try {
      const row = await db.driveMirror.findUnique({
        where: { entity_entityId: { entity, entityId } },
      })
      await db.driveMirror.upsert({
        where: { entity_entityId: { entity, entityId } },
        create: {
          entity,
          entityId,
          lastError: message.slice(0, 500),
          attempts: 1,
        },
        update: {
          lastError: message.slice(0, 500),
          attempts: (row?.attempts ?? 0) + 1,
        },
      })
    } catch (dbErr) {
      console.error("[driveMirror] upis greske u bazu nije uspeo", dbErr)
    }

    return "failed"
  }
}

/** Citljiv dokument jednog zapisa (ili zbirnog registra). */
export function mirrorEntity(
  entity: MirrorEntity,
  entityId: string = REGISTRY_ID,
): Promise<MirrorResult> {
  return mirrorWith(entity, entityId, () => mirrorDef(entity).build(entityId))
}

/** JSON snimak celog modula u `_Podaci/` — iz njega se podaci vracaju u bazu. */
export function mirrorData(entity: DataEntity): Promise<MirrorResult> {
  return mirrorWith(entity, DATA_ID, async () => {
    const snapshot = await buildDataSnapshot(entity)
    return {
      folderPath: [DATA_FOLDER],
      fileName: snapshot.fileName,
      content: snapshot.content,
      // Vreme izvoza se ne heshira — inace bi svaki prolaz prepisivao fajl.
      hashSource: snapshot.content.replace(/^\s*"exportedAt": .*$/m, ""),
      mimeType: "application/json",
    }
  })
}

type PendingItem = { entity: string; entityId: string }

async function collectPending(opts: {
  force?: boolean
  entities?: readonly DataEntity[]
}): Promise<PendingItem[]> {
  const selected = opts.entities as readonly string[] | undefined
  const docEntities = selected
    ? MIRROR_ENTITIES.filter((e) => selected.includes(e))
    : MIRROR_ENTITIES
  const dataEntities = selected
    ? DATA_ENTITIES.filter((e) => selected.includes(e))
    : DATA_ENTITIES

  const rows = await db.driveMirror.findMany({
    where: { entity: { in: [...new Set([...docEntities, ...dataEntities])] } },
    select: {
      entity: true,
      entityId: true,
      fileId: true,
      syncedAt: true,
      lastError: true,
    },
  })
  const byKey = new Map(rows.map((r) => [`${r.entity}/${r.entityId}`, r]))

  const isStale = (
    row: { fileId: string | null; syncedAt: Date | null; lastError: string | null } | undefined,
    changedAt: Date | null,
  ) =>
    Boolean(opts.force) ||
    !row ||
    !row.fileId ||
    !row.syncedAt ||
    row.lastError !== null ||
    (changedAt !== null && row.syncedAt < changedAt)

  const pending: PendingItem[] = []

  // Citljivi dokumenti — po zapisu.
  for (const entity of docEntities) {
    const targets = await mirrorDef(entity).scan()
    for (const target of targets) {
      if (isStale(byKey.get(`${entity}/${target.entityId}`), target.updatedAt)) {
        pending.push({ entity, entityId: target.entityId })
      }
    }
  }

  // JSON snimci — po modulu.
  for (const entity of dataEntities) {
    const latest = await dataDump(entity).latest()
    if (isStale(byKey.get(`${entity}/${DATA_ID}`), latest)) {
      pending.push({ entity, entityId: DATA_ID })
    }
  }

  return pending
}

export type SyncSummary = {
  synced: number
  unchanged: number
  failed: number
  remaining: number
  errors: string[]
}

/**
 * Obradi do `limit` zapisa koji nisu na Drive-u ili su zastareli. Poziva se u
 * petlji (dugme u podesavanjima, backfill skripta) da jedan poziv ne pregori
 * timeout serverless funkcije.
 */
export async function syncPending(
  limit = 25,
  opts: { force?: boolean; entities?: readonly DataEntity[] } = {},
): Promise<SyncSummary> {
  if (!mirrorEnabled()) {
    return {
      synced: 0,
      unchanged: 0,
      failed: 0,
      remaining: 0,
      errors: ["Drive nije konfigurisan (proveri GDRIVE_* env varijable)"],
    }
  }

  const pending = await collectPending(opts)
  const batch = pending.slice(0, limit)

  let synced = 0
  let unchanged = 0
  let failed = 0
  const errors: string[] = []

  for (const item of batch) {
    const result =
      item.entityId === DATA_ID
        ? await mirrorData(item.entity as DataEntity)
        : await mirrorEntity(item.entity as MirrorEntity, item.entityId)
    if (result === "synced") synced++
    else if (result === "unchanged") unchanged++
    else if (result === "failed") {
      failed++
      const row = await db.driveMirror.findUnique({
        where: {
          entity_entityId: { entity: item.entity, entityId: item.entityId },
        },
        select: { lastError: true },
      })
      errors.push(`${item.entity}/${item.entityId}: ${row?.lastError ?? "greska"}`)
    }
  }

  return {
    synced,
    unchanged,
    failed,
    remaining: Math.max(0, pending.length - batch.length),
    errors,
  }
}

export type MirrorStatus = {
  enabled: boolean
  synced: number
  pending: number
  failed: number
  lastSyncedAt: Date | null
  errors: { entity: string; entityId: string; message: string; attempts: number }[]
}

export async function mirrorStatus(): Promise<MirrorStatus> {
  const enabled = mirrorEnabled()

  const [syncedCount, failedCount, failedRows, latest] = await Promise.all([
    db.driveMirror.count({ where: { fileId: { not: null }, lastError: null } }),
    db.driveMirror.count({ where: { lastError: { not: null } } }),
    db.driveMirror.findMany({
      where: { lastError: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { entity: true, entityId: true, lastError: true, attempts: true },
    }),
    db.driveMirror.aggregate({ _max: { syncedAt: true } }),
  ])

  const pending = enabled ? (await collectPending({})).length : 0

  return {
    enabled,
    synced: syncedCount,
    pending,
    failed: failedCount,
    lastSyncedAt: latest._max.syncedAt,
    errors: failedRows.map((r) => ({
      entity: r.entity,
      entityId: r.entityId,
      message: r.lastError ?? "",
      attempts: r.attempts,
    })),
  }
}
