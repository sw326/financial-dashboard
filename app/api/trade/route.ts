import { NextRequest, NextResponse } from "next/server";
import { TRADE_API_BASE_URL } from "@/lib/constants";
import { AptTrade } from "@/lib/types";

// Simple in-memory cache
const cache = new Map<string, { data: AptTrade[]; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function parseTradeItem(item: Record<string, unknown>): AptTrade {
  const amount = String(item["거래금액"] ?? item.dealAmount ?? "0")
    .replace(/,/g, "")
    .trim();
  return {
    dealAmount: parseInt(amount, 10) || 0,
    buildYear: Number(item["건축년도"] ?? item.buildYear ?? 0),
    dealYear: Number(item["년"] ?? item.dealYear ?? 0),
    dealMonth: Number(item["월"] ?? item.dealMonth ?? 0),
    dealDay: Number(item["일"] ?? item.dealDay ?? 0),
    aptName: String(item["아파트"] ?? item.aptNm ?? item.aptName ?? ""),
    area: parseFloat(String(item["전용면적"] ?? item.excluUseAr ?? item.area ?? 0)),
    floor: Number(item["층"] ?? item.floor ?? 0),
    dong: String(item["법정동"] ?? item.umdNm ?? item.dong ?? ""),
    regionCode: String(item["지역코드"] ?? item.sggCd ?? item.regionCode ?? ""),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lawdCd = searchParams.get("lawdCd");
  const dealYmd = searchParams.get("dealYmd");

  if (!lawdCd || !dealYmd) {
    return NextResponse.json(
      { error: "lawdCd와 dealYmd는 필수입니다." },
      { status: 400 }
    );
  }

  const cacheKey = `${lawdCd}_${dealYmd}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ trades: cached.data });
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    // Fetch all pages
    let allItems: AptTrade[] = [];
    let pageNo = 1;
    const numOfRows = 1000;

    while (true) {
      const url = `${TRADE_API_BASE_URL}?serviceKey=${apiKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&pageNo=${pageNo}&numOfRows=${numOfRows}&type=json`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      const body = data?.response?.body;
      
      if (!body) {
        // Might be XML error response
        break;
      }

      const items = body.items?.item;
      if (!items) break;

      const itemArray = Array.isArray(items) ? items : [items];
      const parsed = itemArray.map(parseTradeItem);
      allItems = allItems.concat(parsed);

      const totalCount = body.totalCount ?? 0;
      if (pageNo * numOfRows >= totalCount) break;
      pageNo++;
    }

    cache.set(cacheKey, { data: allItems, ts: Date.now() });

    return NextResponse.json({ trades: allItems });
  } catch (error) {
    console.error("실거래가 API 호출 실패:", error);
    return NextResponse.json(
      { error: "API 호출에 실패했습니다." },
      { status: 500 }
    );
  }
}
