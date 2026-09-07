import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { RequestForm } from "./request-form"

export default async function NoviZahtevPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Нови захтев за интервенцију</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Пријавите квар или проблем у згради
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <RequestForm />
        </CardContent>
      </Card>
    </div>
  )
}
