import { NextRequest, NextResponse } from "next/server";
import { TRADE_API_BASE_URL } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lawdCd = searchParams.get("lawdCd"); // 지역코드
  const dealYmd = searchParams.get("dealYmd"); // 계약월 (YYYYMM)

  if (!lawdCd || !dealYmd) {
    return NextResponse.json(
      { error: "lawdCd와 dealYmd는 필수입니다." },
      { status: 400 }
    );
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const url = `${TRADE_API_BASE_URL}?serviceKey=${apiKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=1&numOfRows=1000&type=json`;
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("실거래가 API 호출 실패:", error);
    return NextResponse.json(
      { error: "API 호출에 실패했습니다." },
      { status: 500 }
    );
  }
}
