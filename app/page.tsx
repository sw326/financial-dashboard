import Link from "next/link";
import { SEOUL_GU } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏠 서울 아파트 실거래가</h1>
        <p className="text-muted-foreground mt-1">
          구를 선택하면 시세 추이를 확인할 수 있습니다
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {SEOUL_GU.map((gu) => (
          <Link key={gu.code} href={`/trend?region=${gu.code}`}>
            <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="p-4">
                <CardTitle className="text-sm text-center">{gu.name}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Link href="/trend">
          <Card className="hover:border-primary transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base">📈 시세 추이</CardTitle>
              <p className="text-sm text-muted-foreground">
                월별 평균 거래가 및 거래량 차트
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/recent">
          <Card className="hover:border-primary transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base">📋 최근 거래</CardTitle>
              <p className="text-sm text-muted-foreground">
                최근 3개월 거래 내역 테이블
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/rank">
          <Card className="hover:border-primary transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-base">🏆 순위</CardTitle>
              <p className="text-sm text-muted-foreground">
                아파트별 평균 거래가 순위
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
