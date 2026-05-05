"use client"

import { Menu, X } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function MobileMenuTrigger() {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar()
  const isOpen = isMobile ? openMobile : open

  return (
    <Button
      variant="ghost"
      onClick={toggleSidebar}
      aria-label={isOpen ? "Zatvori meni" : "Otvori meni"}
      className="h-11 w-11 p-0"
    >
      {isOpen ? (
        <X className="size-6" />
      ) : (
        <Menu className="size-6" />
      )}
    </Button>
  )
}
