import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { UploadForm } from "./upload-form"

export default async function NoviDokumentPage() {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard/arhiva")

  const currentYear = new Date().getFullYear()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novi dokument</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Otpremi PDF, sliku ili Word/Excel dokument (max 20MB)
        </p>
      </div>
      <UploadForm currentYear={currentYear} />
    </div>
  )
}
