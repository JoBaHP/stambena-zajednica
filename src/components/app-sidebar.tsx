"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  ArrowLeftRight,
  ShieldCheck,
  HardHat,
  Megaphone,
  Vote,
  LogOut,
  Building2,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const managerNav = [
  { title: "Pregled", href: "/dashboard", icon: LayoutDashboard },
  { title: "Finansije", href: "/dashboard/finansije", icon: ArrowLeftRight },
  { title: "PP Inspekcije", href: "/dashboard/inspekcije", icon: ShieldCheck },
  { title: "Investicije", href: "/dashboard/investicije", icon: HardHat },
]

const communityNav = [
  { title: "Obavestenja", href: "/dashboard/obavestenja", icon: Megaphone },
  { title: "Glasanje", href: "/dashboard/glasanje", icon: Vote },
  { title: "Stanari", href: "/dashboard/stanari", icon: Users },
]

interface AppSidebarProps {
  userName: string
  userRole: string
}

export function AppSidebar({ userName, userRole }: AppSidebarProps) {
  const pathname = usePathname()
  const isManager = userRole === "MANAGER"

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">Pasterova 16</span>
            <span className="text-xs text-muted-foreground">Stambena Zajednica</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isManager && (
          <SidebarGroup>
            <SidebarGroupLabel>Upravljanje</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managerNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Zajednica</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communityNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    render={<Link href={item.href} />}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-slate-100">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{userName}</span>
            <span className="text-xs text-muted-foreground">
              {isManager ? "Upravnik" : "Stanar"}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Odjava"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
