"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = React.ComponentProps<typeof Button> & {
  /** Tekst dok traje slanje; podrazumevano se prikazuje sam sadrzaj dugmeta. */
  pendingText?: string
}

/**
 * Dugme za slanje forme koje samo zna kada je forma u toku.
 *
 * `useFormStatus` cita stanje najblize roditeljske forme, pa komponenta mora
 * da bude unutar <form>, a ne ona koja je renderuje. Bez ovoga server akcije
 * na sporoj vezi izgledaju kao da nista nisu uradile, pa korisnik klikce
 * ponovo.
 */
export function SubmitButton({ children, pendingText, ...props }: Props) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" {...props} disabled={pending || props.disabled}>
      {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  )
}
