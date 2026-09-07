import { auth } from "@/auth"
import { db } from "@/lib/db"
import { mirrorStatus } from "@/lib/drive-mirror"
import { redirect } from "next/navigation"
import { PasswordForm } from "./password-form"
import { NotificationsForm } from "./notifications-form"
import { DriveSyncCard } from "./drive-sync"

export default async function PodesavanjaPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isManager = session.user.role === "MANAGER"

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, phone: true, notifyEmail: true },
  })

  if (!user) redirect("/login")

  const driveStatus = isManager ? await mirrorStatus() : null

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Подешавања</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Управљање вашим налогом
        </p>
      </div>

      <NotificationsForm
        defaults={{
          notifyEmail: user.notifyEmail,
          phone: user.phone,
          email: user.email,
        }}
      />

      <PasswordForm />

      {driveStatus && (
        <DriveSyncCard
          status={{
            ...driveStatus,
            lastSyncedAt: driveStatus.lastSyncedAt?.toISOString() ?? null,
          }}
        />
      )}
    </div>
  )
}
