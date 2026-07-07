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
  Settings,
  Phone,
  Wrench,
  CalendarClock,
  FolderArchive,
  UserPlus,
  X,
  Gavel,
  Cctv,
  ExternalLink,
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const managerNav = [
  { title: "Pregled", href: "/dashboard", icon: LayoutDashboard },
  { title: "Finansije", href: "/dashboard/finansije", icon: ArrowLeftRight },
  { title: "PP Inspekcije", href: "/dashboard/inspekcije", icon: ShieldCheck },
  { title: "Investicije", href: "/dashboard/investicije", icon: HardHat },
  { title: "Stanari", href: "/dashboard/stanari", icon: Users },
  {
    title: "Zahtevi za pristup",
    href: "/dashboard/zahtevi-za-pristup",
    icon: UserPlus,
  },
  { title: "Kalendar", href: "/dashboard/kalendar", icon: CalendarClock },
]

const communityNav = [
  { title: "Obavestenja", href: "/dashboard/obavestenja", icon: Megaphone },
  { title: "Glasanje", href: "/dashboard/glasanje", icon: Vote },
  { title: "Tenderi", href: "/dashboard/tenderi", icon: Gavel },
  { title: "Zahtevi", href: "/dashboard/zahtevi", icon: Wrench },
  { title: "Arhiva", href: "/dashboard/arhiva", icon: FolderArchive },
  { title: "Kontakti", href: "/dashboard/kontakti", icon: Phone },
]

interface AppSidebarProps {
  userName: string
  userRole: string
  pendingAccessRequests?: number
}

export function AppSidebar({
  userName,
  userRole,
  pendingAccessRequests = 0,
}: AppSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
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
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-br from-indigo-400 to-indigo-600 shadow-sm">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-sm leading-tight">Pasterova 16</span>
            <span className="text-xs text-muted-foreground">Stambena Zajednica</span>
          </div>
          {isMobile && (
            <button
              onClick={() => setOpenMobile(false)}
              aria-label="Zatvori meni"
              className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isManager && (
          <SidebarGroup>
            <SidebarGroupLabel>Upravljanje</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managerNav.map((item) => {
                  const showBadge =
                    item.href === "/dashboard/zahtevi-za-pristup" &&
                    pendingAccessRequests > 0
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          <span className="truncate">{item.title}</span>
                          {showBadge && (
                            <span className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white">
                              {pendingAccessRequests}
                            </span>
                          )}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isManager && process.env.NEXT_PUBLIC_NVR_URL && (
          <SidebarGroup>
            <SidebarGroupLabel>Nadzor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <a
                        href={process.env.NEXT_PUBLIC_NVR_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <Cctv className="w-4 h-4" />
                    <span className="flex-1">Kamere uživo</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
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

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/dashboard/podesavanja"}
              render={<Link href="/dashboard/podesavanja" />}
            >
              <Settings className="w-4 h-4" />
              <span>Podesavanja</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-3 px-3 py-2">
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
        <p className="px-3 pb-3 text-[10px] text-muted-foreground">
          ©{" "}
          <a
            href="https://github.com/JoBaHP"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Jovan Raosavljevic
          </a>
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
