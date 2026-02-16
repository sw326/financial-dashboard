"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// 미리 정의된 주요 종목 리스트
const POPULAR_STOCKS = [
  { symbol: "005930.KS", name: "삼성전자", category: "한국" },
  { symbol: "000660.KS", name: "SK하이닉스", category: "한국" },
  { symbol: "035420.KS", name: "NAVER", category: "한국" },
  { symbol: "035720.KS", name: "카카오", category: "한국" },
  { symbol: "051910.KS", name: "LG화학", category: "한국" },
  { symbol: "006400.KS", name: "삼성SDI", category: "한국" },
  { symbol: "207940.KS", name: "삼성바이오로직스", category: "한국" },
  { symbol: "068270.KS", name: "셀트리온", category: "한국" },
  { symbol: "005380.KS", name: "현대차", category: "한국" },
  { symbol: "000270.KS", name: "기아", category: "한국" },
  { symbol: "012330.KS", name: "현대모비스", category: "한국" },
  { symbol: "028260.KS", name: "삼성물산", category: "한국" },
  { symbol: "105560.KS", name: "KB금융", category: "한국" },
  { symbol: "055550.KS", name: "신한지주", category: "한국" },
  { symbol: "017670.KS", name: "SK텔레콤", category: "한국" },
  { symbol: "AAPL", name: "Apple", category: "미국" },
  { symbol: "MSFT", name: "Microsoft", category: "미국" },
  { symbol: "GOOGL", name: "Alphabet", category: "미국" },
  { symbol: "AMZN", name: "Amazon", category: "미국" },
  { symbol: "NVDA", name: "NVIDIA", category: "미국" },
  { symbol: "TSLA", name: "Tesla", category: "미국" },
  { symbol: "META", name: "Meta", category: "미국" },
  { symbol: "^KS11", name: "코스피", category: "지수" },
  { symbol: "^KQ11", name: "코스닥", category: "지수" },
  { symbol: "^GSPC", name: "S&P 500", category: "지수" },
  { symbol: "^IXIC", name: "나스닥", category: "지수" },
  { symbol: "^DJI", name: "다우존스", category: "지수" },
];

export default function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // 검색어로 필터링
  const filtered = POPULAR_STOCKS.filter((stock) =>
    stock.name.toLowerCase().includes(search.toLowerCase()) ||
    stock.symbol.toLowerCase().includes(search.toLowerCase())
  );

  // 카테고리별로 그룹화
  const grouped = filtered.reduce((acc, stock) => {
    if (!acc[stock.category]) acc[stock.category] = [];
    acc[stock.category].push(stock);
    return acc;
  }, {} as Record<string, typeof POPULAR_STOCKS>);

  const handleSelect = (symbol: string) => {
    setOpen(false);
    setSearch("");
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  // 키보드 단축키: Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">종목 검색...</span>
        <span className="inline-flex lg:hidden">검색</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>종목 검색</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput
              placeholder="종목명 또는 심볼 입력..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
              {Object.entries(grouped).map(([category, stocks]) => (
                <CommandGroup key={category} heading={category}>
                  {stocks.map((stock) => (
                    <CommandItem
                      key={stock.symbol}
                      onSelect={() => handleSelect(stock.symbol)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{stock.name}</span>
                        <span className="text-xs text-muted-foreground">{stock.symbol}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
