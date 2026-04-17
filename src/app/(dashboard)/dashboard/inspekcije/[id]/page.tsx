import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck, ShieldX, ShieldAlert, Pencil, Calendar, User } from "lucide-react"
import { deleteInspection } from "@/server/actions/inspekcije"
import { ConfirmDelete } from "@/components/confirm-delete"
import Link from "next/link"

const resultConfig = {
  PASSED: { label: "Proslo", icon: ShieldCheck, color: "text-green-600", badge: "default" as const },
  FAILED: { label: "Nije proslo", icon: ShieldX, color: "text-red-600", badge: "destructive" as const },
  CONDITIONAL: { label: "Uslovno", icon: ShieldAlert, color: "text-amber-600", badge: "secondary" as const },
}

export default async function InspekcijaDetal({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.role !== "MANAGER") redirect("/dashboard")

  const { id } = await params

  const inspection = await db.pPInspection.findUnique({
    where: { id },
    include: { documents: true },
  })

  if (!inspection) notFound()

  const config = resultConfig[inspection.result]
  const Icon = config.icon
  const deleteWithId = deleteInspection.bind(null, inspection.id)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-8 h-8 mt-0.5 ${config.color}`} />
          <div>
            <h1 className="text-2xl font-semibold">{inspection.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">PP Inspekcija</p>
          </div>
        </div>
        <Badge variant={config.badge}>{config.label}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalji inspekcije</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Datum inspekcije
            </span>
            <span className="text-sm font-medium">
              {new Date(inspection.inspectionDate).toLocaleDateString("sr-RS")}
            </span>
          </div>

          {inspection.nextDueDate && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Sledeca inspekcija
              </span>
              <span className="text-sm font-medium">
                {new Date(inspection.nextDueDate).toLocaleDateString("sr-RS")}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Rezultat</span>
            <Badge variant={config.badge}>{config.label}</Badge>
          </div>

          {inspection.inspector && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <User className="w-4 h-4" /> Inspektor
              </span>
              <span className="text-sm">{inspection.inspector}</span>
            </div>
          )}

          {inspection.notes && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">Napomena</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">{inspection.notes}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Evidentirano: {new Date(inspection.createdAt).toLocaleString("sr-RS")}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" render={<Link href="/dashboard/inspekcije" />}>
          Nazad
        </Button>
        <Button className="flex-1" render={<Link href={`/dashboard/inspekcije/${inspection.id}/uredi`} />}>
          <Pencil className="w-4 h-4 mr-2" />
          Izmeni
        </Button>
        <ConfirmDelete action={deleteWithId} />
      </div>
    </div>
  )
}
