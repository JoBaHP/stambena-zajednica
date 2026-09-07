"use server"

import { auth } from "@/auth"
import { syncPending, type SyncSummary } from "@/lib/drive-mirror"
import { revalidatePath } from "next/cache"

/**
 * Dosinhronizuje jednu turu zapisa koji nisu na Drive-u ili su zastareli.
 * Zove se u petlji sa klijenta, da jedan poziv ne pregori timeout funkcije.
 */
export async function syncPendingMirrors(limit = 20): Promise<SyncSummary> {
  const session = await auth()
  if (!session || session.user.role !== "MANAGER") {
    throw new Error("Немате дозволу")
  }

  const summary = await syncPending(limit)

  if (summary.remaining === 0) {
    revalidatePath("/dashboard/podesavanja")
  }

  return summary
}
