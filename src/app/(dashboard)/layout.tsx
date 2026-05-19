import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AnnouncementWatcher } from "@/components/announcement-watcher"
import { MobileMenuTrigger } from "@/components/mobile-menu-trigger"
import { ResidentTour } from "@/components/resident-tour"
import { db } from "@/lib/db"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const pendingAccessRequests =
    session.user.role === "MANAGER"
      ? await db.accessRequest.count({ where: { status: "PENDING" } })
      : 0

  return (
    <SidebarProvider>
      <AppSidebar
        userName={session.user.name}
        userRole={session.user.role}
        pendingAccessRequests={pendingAccessRequests}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between h-14 px-3 sm:px-4 border-b bg-background sticky top-0 z-10">
          <MobileMenuTrigger />
          {session.user.role === "RESIDENT" && (
            <ResidentTour userId={session.user.id} />
          )}
        </header>
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </main>
      <AnnouncementWatcher />
    </SidebarProvider>
  )
}
