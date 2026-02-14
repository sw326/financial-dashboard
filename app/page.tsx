import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* 지도 Placeholder */}
      <div className="w-full max-w-2xl aspect-[4/3] rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center gap-3">
        <span className="text-5xl">🗺️</span>
        <p className="text-lg font-medium text-muted-foreground">
          지도 준비 중
        </p>
        <p className="text-sm text-muted-foreground/70">
          카카오맵 기반 서울 아파트 실거래가 지도가 곧 제공됩니다
        </p>
      </div>

      {/* 서비스 소개 */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold">서울 아파트 실거래가</h1>
        <p className="text-sm text-muted-foreground">
          국토교통부 실거래가 공공데이터 기반 · 시세 추이 · 최근 거래 · 순위
        </p>
      </div>

      {/* 탭 링크 */}
      <div className="flex gap-6 text-sm">
        <Link href="/trend" className="text-muted-foreground hover:text-foreground transition-colors">
          📈 시세 추이
        </Link>
        <Link href="/recent" className="text-muted-foreground hover:text-foreground transition-colors">
          📋 최근 거래
        </Link>
        <Link href="/rank" className="text-muted-foreground hover:text-foreground transition-colors">
          🏆 순위
        </Link>
      </div>
    </div>
  );
}
