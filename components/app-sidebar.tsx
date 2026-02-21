"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  MessageSquare,
  Wallet,
  Plus,
  Trash2,
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
    label: "대시보드",
    items: [
      { title: "대시보드", url: "/", icon: LayoutDashboard },
      { title: "증시", url: "/market", icon: BarChart3 },
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
  const router = useRouter()
  const isOnChat = pathname.startsWith("/chat")
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const loadConversations = React.useCallback(() => {
    supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setConversations(data)
      })
  }, [])

  React.useEffect(() => {
    if (!isOnChat) return
    loadConversations()

    const channel = supabase
      .channel("conversations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, loadConversations)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isOnChat, loadConversations])

  const handleDelete = React.useCallback(async (e: React.MouseEvent, convId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(convId)
    try {
      await supabase.from("conversations").delete().eq("id", convId)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      // 삭제한 대화방에 있었으면 새 채팅으로
      if (pathname === `/chat/${convId}`) {
        router.push("/chat")
      }
    } finally {
      setDeletingId(null)
    }
  }, [pathname, router])

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
            <SidebarGroupLabel className="flex items-center justify-between pr-1">
              <span>대화 목록</span>
              <Link
                href="/chat"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3 w-3" />
                새 채팅
              </Link>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {conversations.length === 0 && (
                  <p className="px-2 py-3 text-xs text-muted-foreground">대화 내역이 없어요</p>
                )}
                {conversations.map((conv) => (
                  <SidebarMenuItem key={conv.id} className="group/item">
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/chat/${conv.id}`}
                      tooltip={conv.title || "새 대화"}
                      className="pr-1"
                    >
                      <Link href={`/chat/${conv.id}`} className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="truncate flex-1">{conv.title || "새 대화"}</span>
                        <button
                          onClick={(e) => handleDelete(e, conv.id)}
                          disabled={deletingId === conv.id}
                          className="opacity-0 group-hover/item:opacity-100 shrink-0 p-0.5 rounded hover:text-destructive transition-all"
                          aria-label="대화 삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
