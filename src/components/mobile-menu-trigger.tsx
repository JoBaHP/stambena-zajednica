"use client"

import { Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function MobileMenuTrigger() {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar()
  const isOpen = isMobile ? openMobile : open

  let icon
  if (isMobile) {
    icon = isOpen ? <X className="size-6" /> : <Menu className="size-6" />
  } else {
    icon = isOpen ? (
      <PanelLeftClose className="size-6" />
    ) : (
      <PanelLeftOpen className="size-6" />
    )
  }

  return (
    <Button
      variant="ghost"
      onClick={toggleSidebar}
      aria-label={
        isOpen
          ? isMobile
            ? "Затвори мени"
            : "Сакриј мени"
          : isMobile
            ? "Отвори мени"
            : "Прикажи мени"
      }
      className="h-11 w-11 p-0"
    >
      {icon}
    </Button>
  )
}
