import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { PasswordForm } from "./password-form"
import { NotificationsForm } from "./notifications-form"

export default async function PodesavanjaPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, phone: true, notifyEmail: true, notifySms: true },
  })

  if (!user) redirect("/login")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Podesavanja</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upravljanje vasim nalogom
        </p>
      </div>

      <NotificationsForm
        defaults={{
          notifyEmail: user.notifyEmail,
          notifySms: user.notifySms,
          phone: user.phone,
          email: user.email,
        }}
      />

      <PasswordForm />
    </div>
  )
}
