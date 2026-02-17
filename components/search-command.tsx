"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
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
import { KR_STOCK_NAMES } from "@/lib/kr-stock-names";
import { SEOUL_GU } from "@/lib/constants";

// 한국 종목
const KR_STOCKS = Object.entries(KR_STOCK_NAMES).map(([symbol, name]) => ({
  symbol,
  name,
  category: "한국",
}));

// 미국 주요 종목
const US_STOCKS = [
  { symbol: "AAPL", name: "Apple", category: "미국" },
  { symbol: "MSFT", name: "Microsoft", category: "미국" },
  { symbol: "GOOGL", name: "Alphabet", category: "미국" },
  { symbol: "AMZN", name: "Amazon", category: "미국" },
  { symbol: "NVDA", name: "NVIDIA", category: "미국" },
  { symbol: "TSLA", name: "Tesla", category: "미국" },
  { symbol: "META", name: "Meta", category: "미국" },
];

// 지수 리스트
const INDEX_STOCKS = [
  { symbol: "^KS11", name: "코스피", category: "지수" },
  { symbol: "^KQ11", name: "코스닥", category: "지수" },
  { symbol: "^GSPC", name: "S&P 500", category: "지수" },
  { symbol: "^IXIC", name: "나스닥", category: "지수" },
  { symbol: "^DJI", name: "다우존스", category: "지수" },
];

// 인기 종목 10개
const POPULAR_STOCKS = [
  KR_STOCKS[0], // 삼성전자
  KR_STOCKS[1], // SK하이닉스
  KR_STOCKS[7], // NAVER
  KR_STOCKS[8], // 카카오
  KR_STOCKS[4], // 현대차
  US_STOCKS[4], // NVIDIA
  US_STOCKS[5], // Tesla
  US_STOCKS[0], // Apple
  INDEX_STOCKS[0], // 코스피
  INDEX_STOCKS[2], // S&P 500
];

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export default function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced API search
  const fetchSearch = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setApiResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      const controller = new AbortController();

      fetch(`/api/finance/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: { results: SearchResult[] }) => {
          setApiResults(data.results || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }, 300);
  }, []);

  useEffect(() => {
    fetchSearch(search);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [search, fetchSearch]);

  // 로컬 부동산 매칭
  const matchedGu = search.trim()
    ? SEOUL_GU.filter((gu) => gu.name.includes(search.trim()))
    : SEOUL_GU;

  // 로컬 지수 매칭
  const matchedIndex = search.trim()
    ? INDEX_STOCKS.filter(
        (idx) =>
          idx.name.toLowerCase().includes(search.toLowerCase()) ||
          idx.symbol.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handleSelectStock = (symbol: string) => {
    setOpen(false);
    setSearch("");
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  const handleSelectGu = (code: string) => {
    setOpen(false);
    setSearch("");
    router.push(`/real-estate/${code}`);
  };

  // Cmd+K 단축키
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const hasSearch = search.trim().length > 0;

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
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="종목명 또는 심볼 입력..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">검색 중...</span>
                </div>
              )}

              {!hasSearch && (
                <>
                  <CommandGroup heading="인기 종목">
                    {POPULAR_STOCKS.map((stock) => (
                      <CommandItem
                        key={stock.symbol}
                        onSelect={() => handleSelectStock(stock.symbol)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{stock.name}</span>
                          <span className="text-xs text-muted-foreground">{stock.symbol}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="부동산">
                    {SEOUL_GU.map((gu) => (
                      <CommandItem
                        key={gu.code}
                        onSelect={() => handleSelectGu(gu.code)}
                        className="cursor-pointer"
                      >
                        <span className="font-medium">{gu.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {hasSearch && !loading && (
                <>
                  {apiResults.length > 0 && (
                    <CommandGroup heading="종목">
                      {apiResults.map((result) => (
                        <CommandItem
                          key={result.symbol}
                          onSelect={() => handleSelectStock(result.symbol)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{result.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {result.symbol} · {result.exchange}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {matchedGu.length > 0 && (
                    <CommandGroup heading="부동산">
                      {matchedGu.map((gu) => (
                        <CommandItem
                          key={gu.code}
                          onSelect={() => handleSelectGu(gu.code)}
                          className="cursor-pointer"
                        >
                          <span className="font-medium">{gu.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {matchedIndex.length > 0 && (
                    <CommandGroup heading="지수">
                      {matchedIndex.map((idx) => (
                        <CommandItem
                          key={idx.symbol}
                          onSelect={() => handleSelectStock(idx.symbol)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{idx.name}</span>
                            <span className="text-xs text-muted-foreground">{idx.symbol}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {apiResults.length === 0 && matchedGu.length === 0 && matchedIndex.length === 0 && (
                    <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
