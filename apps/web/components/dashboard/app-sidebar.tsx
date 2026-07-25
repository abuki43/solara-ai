"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBook,
  IconCalendarCheck,
  IconFile,
  IconMicrophone,
  IconPhone,
  IconRobot,
  IconSettings,
  IconTool,
} from "@tabler/icons-react";

import { NavUser } from "@/components/dashboard/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/agents", label: "Agents", icon: IconRobot },
  { href: "/voice", label: "Voice", icon: IconMicrophone },
  { href: "/knowledge", label: "Knowledge", icon: IconBook },
  { href: "/files", label: "Files", icon: IconFile },
  { href: "/tools", label: "Tools", icon: IconTool },
  { href: "/bookings", label: "Bookings", icon: IconCalendarCheck },
  { href: "/calls", label: "Calls", icon: IconPhone },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/agents">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <IconRobot className="size-4" />
                </div>
                <span className="text-base font-semibold">Solar AI</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/agents" && pathname.startsWith(`${item.href}/`)) ||
                  (item.href === "/agents" &&
                    (pathname === "/agents" ||
                      pathname.startsWith("/agents/new") ||
                      pathname.startsWith("/agents/")));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
