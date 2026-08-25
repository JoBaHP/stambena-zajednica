import { after } from "next/server"
import { mirrorData, mirrorEnabled, mirrorEntity } from "./index"
import { type DataEntity } from "./data"
import { REGISTRY_ID, type MirrorEntity } from "./registry"

/**
 * Zakazuje upis na Drive posle sto odgovor stigne korisniku. Zove se iz server
 * akcija; radi i kada akcija zavrsi redirect()-om.
 *
 * Upisuje dva fajla: citljiv dokument zapisa i JSON snimak celog modula (iz kog
 * se podaci vracaju u bazu). Pri brisanju zapisa citljiv dokument ostaje
 * netaknut, a JSON snimak se osvezi — zato se poziva i iz delete akcija.
 *
 * Odvojeno od index.ts jer `next/server` postoji samo unutar Next runtime-a —
 * backfill i restore skripte (obican node) uvoze index.ts bez ovog fajla.
 */
export function scheduleMirror(
  entity: MirrorEntity,
  entityId: string = REGISTRY_ID,
): void {
  if (!mirrorEnabled()) return
  after(async () => {
    await mirrorEntity(entity, entityId)
    await mirrorData(entity)
  })
}

/** Samo JSON snimak modula — za module bez citljivog dokumenta (arhiva). */
export function scheduleDataMirror(entity: DataEntity): void {
  if (!mirrorEnabled()) return
  after(async () => {
    await mirrorData(entity)
  })
}
