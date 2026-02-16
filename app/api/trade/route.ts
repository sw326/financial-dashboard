import { NextRequest, NextResponse } from "next/server";
import { TRADE_API_BASE_URL } from "@/lib/constants";
import { AptTrade } from "@/lib/types";

// Simple in-memory cache
const cache = new Map<string, { data: AptTrade[]; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function parseXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function parseTradeItemFromXml(itemXml: string): AptTrade {
  const amount = parseXmlValue(itemXml, "dealAmount").replace(/,/g, "").trim();
  return {
    dealAmount: parseInt(amount, 10) || 0,
    buildYear: Number(parseXmlValue(itemXml, "buildYear")) || 0,
    dealYear: Number(parseXmlValue(itemXml, "dealYear")) || 0,
    dealMonth: Number(parseXmlValue(itemXml, "dealMonth")) || 0,
    dealDay: Number(parseXmlValue(itemXml, "dealDay")) || 0,
    aptName: parseXmlValue(itemXml, "aptNm") || parseXmlValue(itemXml, "아파트") || "",
    area: parseFloat(parseXmlValue(itemXml, "excluUseAr") || parseXmlValue(itemXml, "전용면적") || "0"),
    floor: Number(parseXmlValue(itemXml, "floor") || parseXmlValue(itemXml, "층")) || 0,
    dong: parseXmlValue(itemXml, "umdNm") || parseXmlValue(itemXml, "법정동") || "",
    regionCode: parseXmlValue(itemXml, "sggCd") || parseXmlValue(itemXml, "지역코드") || "",
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
    let allItems: AptTrade[] = [];
    let pageNo = 1;
    const numOfRows = 1000;

    while (true) {
      const params = new URLSearchParams({
        serviceKey: apiKey,
        LAWD_CD: lawdCd,
        DEAL_YMD: dealYmd,
        pageNo: String(pageNo),
        numOfRows: String(numOfRows),
      });
      const url = `${TRADE_API_BASE_URL}?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const xml = await res.text();

      // Check for error
      const resultCode = parseXmlValue(xml, "resultCode");
      if (resultCode && resultCode !== "000" && resultCode !== "00") {
        const resultMsg = parseXmlValue(xml, "resultMsg");
        throw new Error(`API error: ${resultCode} ${resultMsg}`);
      }

      // Parse items
      const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
      if (!itemMatches || itemMatches.length === 0) break;

      const parsed = itemMatches.map(parseTradeItemFromXml);
      allItems = allItems.concat(parsed);

      // Check total count for pagination
      const totalCount = Number(parseXmlValue(xml, "totalCount")) || 0;
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
