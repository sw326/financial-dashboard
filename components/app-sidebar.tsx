"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  MessageSquare,
  Wallet,
  Plus,
  Trash2,
  Bell,
  BellOff,
  LogIn,
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
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { usePushNotification } from "@/hooks/use-push-notification"
import { cn } from "@/lib/utils"

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
  const { isLoggedIn } = useAuth()
  const { isSupported, isSubscribed, isLoading: pushLoading, error: pushError, subscribe, unsubscribe } = usePushNotification()
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const loadConversations = React.useCallback(() => {
    supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setConversations(data)
      })
  }, [])

  React.useEffect(() => {
    if (!isOnChat || !isLoggedIn) {
      setConversations([])
      return
    }
    loadConversations()

    // 같은 탭 대화 생성 이벤트
    const handleNewConv = () => loadConversations()
    window.addEventListener("conversationCreated", handleNewConv)

    // 다른 탭/기기 실시간 동기화
    const channel = supabase
      .channel("app-sidebar-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, loadConversations)
      .subscribe()

    return () => {
      window.removeEventListener("conversationCreated", handleNewConv)
      supabase.removeChannel(channel)
    }
  }, [isOnChat, isLoggedIn, loadConversations])

  const handleDelete = React.useCallback(async (e: React.MouseEvent, convId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(convId)
    // CHM-258: 낙관적 업데이트 — 실패 시 롤백
    const snapshot = [...conversations]
    setConversations((prev) => prev.filter((c) => c.id !== convId))
    try {
      const { error } = await supabase.from("conversations").delete().eq("id", convId)
      if (error) throw error
      if (pathname === `/chat/${convId}`) router.push("/chat")
    } catch (err) {
      // 실패 시 롤백 + 토스트
      setConversations(snapshot)
      toast.error("대화 삭제에 실패했습니다", { description: String(err) })
      console.error("[Sidebar] Delete conversation failed:", err)
    } finally {
      setDeletingId(null)
    }
  }, [pathname, router, conversations])

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
              <div className="flex items-center gap-1">
                {/* 푸시 알림 토글 — 로그인 + 지원 브라우저만 */}
                {isLoggedIn && isSupported && (
                  <button
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    disabled={pushLoading}
                    title={pushError ?? (isSubscribed ? "알림 끄기" : "알림 켜기")}
                    className={cn(
                      "p-1 rounded hover:bg-muted transition-colors",
                      isSubscribed ? "text-primary" : "text-muted-foreground",
                      pushError && "text-destructive",
                      pushLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {pushLoading
                      ? <span className="block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      : isSubscribed
                        ? <Bell className="h-3.5 w-3.5" />
                        : <BellOff className="h-3.5 w-3.5" />
                    }
                  </button>
                )}
                <Link
                  href="/chat"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  새 채팅
                </Link>
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {!isLoggedIn ? (
                  <div className="px-2 py-3 space-y-2">
                    <p className="text-xs text-muted-foreground">로그인하면 대화가 저장돼요</p>
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" asChild>
                      <Link href="/auth/login?next=/chat">
                        <LogIn className="h-3.5 w-3.5" />
                        로그인
                      </Link>
                    </Button>
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">대화 내역이 없어요</p>
                ) : (
                  conversations.map((conv) => (
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
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
