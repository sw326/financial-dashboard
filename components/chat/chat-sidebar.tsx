"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Wallet, ArrowLeft, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export function ChatSidebar() {
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!isLoggedIn) {
      setConversations([]);
      return;
    }
    loadConversations();
  }, [isLoggedIn]);

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  }

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Wallet className="h-4 w-4" />
            <span>대시보드</span>
          </Link>
        </div>
        <Link href="/chat">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            새 대화
          </Button>
        </Link>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          // 로딩 스켈레톤
          <div className="p-3 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : !isLoggedIn ? (
          // 비로그인 empty state
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center gap-3">
            <LogIn className="h-8 w-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">대화 내역 없음</p>
              <p className="text-xs text-muted-foreground/70">
                로그인하면 대화가 저장되고<br />언제든 이어볼 수 있어요
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="w-full gap-2">
              <Link href="/auth/login?next=/chat">
                <LogIn className="h-3.5 w-3.5" />
                로그인
              </Link>
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => {
              const isActive = pathname === `/chat/${conv.id}`;
              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors truncate",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conv.title || "새 대화"}</span>
                </Link>
              );
            })}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">대화가 없습니다</p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
