import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Plus, Siren, Building2, Wrench, Pencil } from "lucide-react"
import Link from "next/link"
import { deleteContact } from "@/server/actions/kontakti"
import { ConfirmDelete } from "@/components/confirm-delete"

const categoryConfig = {
  EMERGENCY: { label: "Hitne sluzbe", icon: Siren, color: "text-red-600" },
  MANAGEMENT: { label: "Upravnik", icon: Building2, color: "text-blue-600" },
  MAINTENANCE: { label: "Odrzavanje", icon: Wrench, color: "text-amber-600" },
}

const categoryOrder: Array<"EMERGENCY" | "MANAGEMENT" | "MAINTENANCE"> = [
  "EMERGENCY",
  "MANAGEMENT",
  "MAINTENANCE",
]

export default async function KontaktiPage() {
  const session = await auth()
  const isManager = session?.user.role === "MANAGER"

  const contacts = await db.contact.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  const grouped = categoryOrder.map((cat) => ({
    category: cat,
    config: categoryConfig[cat],
    contacts: contacts.filter((c) => c.category === cat),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Korisni kontakti</h1>
          <p className="text-sm text-muted-foreground mt-1">Hitne sluzbe, upravnik i odrzavanje zgrade</p>
        </div>
        {isManager && (
          <Button render={<Link href="/dashboard/kontakti/novi" />}>
            <Plus className="w-4 h-4 mr-2" />
            Dodaj kontakt
          </Button>
        )}
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Nema kontakata</p>
            {isManager && (
              <Button
                className="mt-4"
                variant="outline"
                render={<Link href="/dashboard/kontakti/novi" />}
              >
                Dodaj prvi kontakt
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped
            .filter((g) => g.contacts.length > 0)
            .map((g) => {
              const Icon = g.config.icon
              return (
                <Card key={g.category}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`text-base flex items-center gap-2 ${g.config.color}`}>
                      <Icon className="w-5 h-5" />
                      {g.config.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {g.contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{contact.name}</p>
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-primary hover:underline"
                            >
                              {contact.phone}
                            </a>
                            {contact.note && (
                              <p className="text-sm text-muted-foreground">{contact.note}</p>
                            )}
                          </div>
                          {isManager && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                render={<Link href={`/dashboard/kontakti/${contact.id}/uredi`} />}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <ConfirmDelete
                                action={deleteContact.bind(null, contact.id)}
                                label=""
                                confirmLabel="Obrisi?"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
