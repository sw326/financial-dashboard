"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  symbol: string;
  name?: string;
  market?: string;
  size?: "sm" | "default";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function WatchlistButton({ symbol, name, market, size = "default", className, onClick: onClickProp }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const { symbolSet, toggle, add, remove } = useWatchlist();
  const router = useRouter();

  const isWatched = symbolSet.has(symbol);
  const isPending = add.isPending || remove.isPending;

  const handleClick = () => {
    if (!user) {
      router.push("/auth/login?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    toggle(symbol, name, market);
  };

  if (authLoading) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size === "sm" ? "icon" : "sm"}
            className={cn(
              "transition-colors",
              isWatched
                ? "text-yellow-400 hover:text-yellow-300"
                : "text-muted-foreground hover:text-yellow-400",
              className
            )}
            onClick={(e) => { onClickProp?.(e); handleClick(); }}
            disabled={isPending}
            aria-label={isWatched ? "관심종목 해제" : "관심종목 추가"}
          >
            <Star
              className={cn(
                size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
                isWatched && "fill-yellow-400"
              )}
            />
            {size !== "sm" && (
              <span className="hidden sm:inline ml-1 text-xs">{isWatched ? "관심" : "관심추가"}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!user ? "로그인하면 관심종목을 저장할 수 있어요" : isWatched ? "관심종목 해제" : "관심종목 추가"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
