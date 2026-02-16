"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  BarChart3,
  LineChart,
  TrendingUp,
  ClipboardList,
  Trophy,
  Wallet,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const navGroups = [
  {
    label: "메인",
    items: [
      {
        title: "대시보드",
        url: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "증시",
    items: [
      {
        title: "시장개요",
        url: "/market",
        icon: BarChart3,
      },
      {
        title: "종목차트",
        url: "/stock",
        icon: LineChart,
      },
    ],
  },
  {
    label: "부동산",
    items: [
      {
        title: "시세추이",
        url: "/trend",
        icon: TrendingUp,
      },
      {
        title: "최근거래",
        url: "/recent",
        icon: ClipboardList,
      },
      {
        title: "순위",
        url: "/rank",
        icon: Trophy,
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarContent>
        <div className="px-3 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
            <Wallet className="size-5" />
            <span className="hidden lg:inline">Financial Dashboard</span>
            <span className="lg:hidden">FD</span>
          </Link>
        </div>
        
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.url
                  
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      
      <SidebarFooter>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">테마</span>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
