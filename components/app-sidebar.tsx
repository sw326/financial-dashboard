"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  MessageSquare,
  Wallet,
  Plus,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase"

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

const navGroups = [
  {
    label: "메인",
    items: [
      { title: "대시보드", url: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "증시",
    items: [
      { title: "증시", url: "/market", icon: BarChart3 },
    ],
  },
  {
    label: "부동산",
    items: [
      { title: "부동산", url: "/real-estate", icon: Building2 },
    ],
  },
  {
    label: "AI",
    items: [
      { title: "채팅", url: "/chat", icon: MessageSquare },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const isOnChat = pathname.startsWith("/chat")
  const [conversations, setConversations] = React.useState<Conversation[]>([])

  React.useEffect(() => {
    if (!isOnChat) return
    supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setConversations(data)
      })
  }, [isOnChat, pathname])

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
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
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

        {isOnChat && (
          <SidebarGroup>
            <SidebarGroupLabel>대화 목록</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/chat"} tooltip="새 대화">
                    <Link href="/chat">
                      <Plus className="h-4 w-4" />
                      <span>새 대화</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {conversations.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/chat/${conv.id}`}
                      tooltip={conv.title || "새 대화"}
                    >
                      <Link href={`/chat/${conv.id}`}>
                        <MessageSquare className="h-4 w-4" />
                        <span className="truncate">{conv.title || "새 대화"}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
