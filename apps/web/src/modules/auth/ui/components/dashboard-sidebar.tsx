"use client"

import { UserButton } from "@clerk/nextjs"
import {
  LayoutDashboardIcon,
  MapIcon,
  AlertTriangleIcon,
  HandHelpingIcon,
  BoxIcon,
  UsersIcon,
  HomeIcon,
  BellIcon,
  ShieldIcon,
  SpeakerIcon,
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
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import Link from "next/link"

const overviewItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboardIcon,
    url: "/dashboard",
  },
  {
    title: "Map View",
    icon: MapIcon,
    url: "/map",
  },
]

const operationsItems = [
  {
    title: "Reports",
    icon: SpeakerIcon,
    url: "/reports",
  },
  {
    title: "Incidents",
    icon: AlertTriangleIcon,
    url: "/incidents",
  },
  {
    title: "Requests",
    icon: HandHelpingIcon,
    url: "/requests",
  },
  {
    title: "Resources",
    icon: BoxIcon,
    url: "/resources",
  },
  {
    title: "Teams",
    icon: UsersIcon,
    url: "/teams",
  },
  {
    title: "Shelter",
    icon: HomeIcon,
    url: "/shelter",
  },
]

const managementItems = [
  {
    title: "Coordinator",
    icon: ShieldIcon,
    url: "/coordinator",
  },
  {
    title: "Notifications",
    icon: BellIcon,
    url: "/notifications",
  },
]

export const DashboardSidebar = () => {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(url)
  }

  return (
    <Sidebar className="group" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/dashboard" />} size="lg" className="gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ShieldIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sidebar-foreground">Pukaar</span>
                  <span className="text-xs text-sidebar-foreground/60">Disaster Response</span>
                </div>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      "transition-colors hover:rounded-none hover:bg-muted-foreground/40",
                      isActive(item.url) &&
                        "bg-sidebar-accent! rounded-none! text-sidebar-accent-foreground! font-medium"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      "transition-colors hover:rounded-none hover:bg-muted-foreground/40",
                      isActive(item.url) &&
                        "bg-sidebar-accent! rounded-none! text-sidebar-accent-foreground! font-medium"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      "transition-colors hover:rounded-none hover:bg-muted-foreground/40",
                      isActive(item.url) &&
                        "bg-sidebar-accent! rounded-none! text-sidebar-accent-foreground! font-medium"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserButton
              showName
              appearance={{
                elements: {
                  rootbox: "w-full h-8!",
                  userButtonTrigger:
                    "w-full! p-2! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                  userButtonBox:
                    "w-full! flex-row-reverse! justify-end! gap-2! group-data-[collapsible=icon]:justify-center! text-sidebar-foreground!",
                  userButtonOuterIdentifier:
                    "pl-0! group-data-[collapsible=icon]:hidden!",
                  avatarBox: "size-5!",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}


