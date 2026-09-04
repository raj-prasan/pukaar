
import { AuthGuard } from "@/app/components/auth-guard"
import { SidebarProvider } from "@/components/ui/sidebar"
import { cookies } from "next/headers"
import { DashboardSidebar } from "../components/dashboard-sidebar"

export const DashboardLayout = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
  return (
    <AuthGuard>
        <SidebarProvider defaultOpen={defaultOpen} className="h-svh">
          <DashboardSidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </SidebarProvider>
    </AuthGuard>
  )
}
