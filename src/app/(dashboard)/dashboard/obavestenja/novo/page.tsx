import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AnnouncementForm } from "./announcement-form"

export default async function NovoObavestenjePage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo obavestenje</h1>
        <p className="text-sm text-muted-foreground mt-1">Objavi obavestenje na oglasnu tablu</p>
      </div>
      <AnnouncementForm />
    </div>
  )
}
