import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AnnouncementWatcher } from "@/components/announcement-watcher"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <SidebarProvider>
      <AppSidebar userName={session.user.name} userRole={session.user.role} />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center h-12 px-4 border-b bg-background sticky top-0 z-10">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
      <AnnouncementWatcher />
    </SidebarProvider>
  )
}
