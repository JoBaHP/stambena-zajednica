import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ManagerDashboard } from "./manager-dashboard"
import { ResidentDashboard } from "./resident-dashboard"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // Upravnik i stanar gledaju razlicite stvari: upravniku treba spisak onoga
  // sto trazi njegovu akciju, stanaru obavestenja i glasanje koje ga ceka.
  return session.user.role === "MANAGER" ? (
    <ManagerDashboard name={session.user.name ?? "управниче"} />
  ) : (
    <ResidentDashboard userId={session.user.id} name={session.user.name ?? "комшија"} />
  )
}
