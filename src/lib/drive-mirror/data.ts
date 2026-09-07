// Masinski citljiv sloj ogledanja: pored citljivih .txt dokumenata, svaki modul
// dobija i JSON snimak trenutnog stanja u folderu `_Podaci/`. Iz njega se podaci
// mogu vratiti u bazu (scripts/restore-from-drive.ts) — .txt je za ljude, JSON za
// aplikaciju.

import { db } from "@/lib/db"
import { MIRROR_ENTITIES } from "./registry"

/** Folder u kom zive JSON snimci. */
export const DATA_FOLDER = "_Podaci"

/** entityId pod kojim se prati JSON snimak jednog modula. */
export const DATA_ID = "_json"

// ARCHIVE nema citljiv dokument (sam fajl u arhivi to jeste), ali mu metapodaci
// — narocito Drive fileId — moraju u backup da bi se arhiva mogla vratiti.
export const DATA_ENTITIES = [...MIRROR_ENTITIES, "ARCHIVE"] as const
export type DataEntity = (typeof DATA_ENTITIES)[number]

type DataDump = {
  /** Ime fajla u `_Podaci/`. */
  fileName: string
  /** Najsvezija promena u modulu — odredjuje da li je snimak zastareo. */
  latest(): Promise<Date | null>
  /** Sadrzaj snimka. */
  load(): Promise<Record<string, unknown>>
}

const DUMPS: Record<DataEntity, DataDump> = {
  ANNOUNCEMENT: {
    fileName: "Obavestenja.json",
    latest: async () =>
      (await db.announcement.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    load: async () => ({ records: await db.announcement.findMany() }),
  },

  TRANSACTION: {
    fileName: "Finansije.json",
    latest: async () =>
      (await db.transaction.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    load: async () => ({
      // Kategorije idu uz transakcije jer transaction.categoryId pokazuje na njih.
      categories: await db.transactionCategory.findMany(),
      records: await db.transaction.findMany(),
    }),
  },

  REQUEST: {
    fileName: "Zahtevi.json",
    latest: async () =>
      (await db.maintenanceRequest.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    load: async () => ({
      records: await db.maintenanceRequest.findMany(),
      comments: await db.requestComment.findMany(),
      photos: await db.document.findMany({ where: { requestId: { not: null } } }),
    }),
  },

  TASK: {
    fileName: "Kalendar.json",
    latest: async () =>
      (await db.task.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    load: async () => ({ records: await db.task.findMany() }),
  },

  INSPECTION: {
    fileName: "Inspekcije.json",
    latest: async () =>
      (await db.pPInspection.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    load: async () => ({ records: await db.pPInspection.findMany() }),
  },

  INVESTMENT: {
    fileName: "Investicije.json",
    latest: async () =>
      (await db.investment.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    load: async () => ({ records: await db.investment.findMany() }),
  },

  POLL: {
    fileName: "Glasanja.json",
    latest: async () =>
      (await db.poll.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    load: async () => ({
      records: await db.poll.findMany(),
      options: await db.pollOption.findMany(),
      votes: await db.vote.findMany(),
    }),
  },

  TENDER: {
    fileName: "Tenderi.json",
    latest: async () =>
      (await db.tender.aggregate({ _max: { createdAt: true } }))._max
        .createdAt ?? null,
    load: async () => ({
      records: await db.tender.findMany(),
      offers: await db.tenderOffer.findMany(),
      votes: await db.tenderVote.findMany(),
    }),
  },

  CONTACT: {
    fileName: "Kontakti.json",
    latest: async () =>
      (await db.contact.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    load: async () => ({ records: await db.contact.findMany() }),
  },

  RESIDENT: {
    fileName: "Stanari.json",
    latest: async () =>
      (await db.user.aggregate({ _max: { updatedAt: true } }))._max
        .updatedAt ?? null,
    // Hes lozinke NIKAD ne ide na Drive — pri vracanju korisnici dobijaju
    // privremenu lozinku koju upravnik resetuje.
    load: async () => ({
      records: await db.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          unit: true,
          area: true,
          notifyEmail: true,
          active: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    }),
  },

  ARCHIVE: {
    fileName: "Arhiva.json",
    latest: async () =>
      (await db.archiveDocument.aggregate({ _max: { createdAt: true } }))._max
        .createdAt ?? null,
    load: async () => ({ records: await db.archiveDocument.findMany() }),
  },
}

export function dataDump(entity: DataEntity): DataDump {
  return DUMPS[entity]
}

export function isDataEntity(entity: string): entity is DataEntity {
  return (DATA_ENTITIES as readonly string[]).includes(entity)
}

export async function buildDataSnapshot(entity: DataEntity): Promise<{
  fileName: string
  content: string
}> {
  const dump = dataDump(entity)
  const payload = await dump.load()
  const records = payload.records
  return {
    fileName: dump.fileName,
    content:
      JSON.stringify(
        {
          entity,
          exportedAt: new Date().toISOString(),
          count: Array.isArray(records) ? records.length : null,
          ...payload,
        },
        null,
        2,
      ) + "\n",
  }
}
