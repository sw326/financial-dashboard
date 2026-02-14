import { Region } from "./types";

/** 서울시 구 법정동코드 (앞 5자리) + 중심 좌표 */
export const SEOUL_GU: Region[] = [
  { code: "11110", name: "종로구", lat: 37.5735, lng: 126.979 },
  { code: "11140", name: "중구", lat: 37.5641, lng: 126.9979 },
  { code: "11170", name: "용산구", lat: 37.5326, lng: 126.991 },
  { code: "11200", name: "성동구", lat: 37.5634, lng: 127.0369 },
  { code: "11215", name: "광진구", lat: 37.5385, lng: 127.0823 },
  { code: "11230", name: "동대문구", lat: 37.5744, lng: 127.0395 },
  { code: "11260", name: "중랑구", lat: 37.6063, lng: 127.0925 },
  { code: "11290", name: "성북구", lat: 37.5894, lng: 127.0167 },
  { code: "11305", name: "강북구", lat: 37.6396, lng: 127.0255 },
  { code: "11320", name: "도봉구", lat: 37.6688, lng: 127.0472 },
  { code: "11350", name: "노원구", lat: 37.6542, lng: 127.0568 },
  { code: "11380", name: "은평구", lat: 37.6027, lng: 126.9291 },
  { code: "11410", name: "서대문구", lat: 37.5791, lng: 126.9368 },
  { code: "11440", name: "마포구", lat: 37.5637, lng: 126.9084 },
  { code: "11470", name: "양천구", lat: 37.517, lng: 126.8666 },
  { code: "11500", name: "강서구", lat: 37.551, lng: 126.8495 },
  { code: "11530", name: "구로구", lat: 37.4954, lng: 126.8874 },
  { code: "11545", name: "금천구", lat: 37.4519, lng: 126.8968 },
  { code: "11560", name: "영등포구", lat: 37.5264, lng: 126.8963 },
  { code: "11590", name: "동작구", lat: 37.5124, lng: 126.9393 },
  { code: "11620", name: "관악구", lat: 37.4784, lng: 126.9516 },
  { code: "11650", name: "서초구", lat: 37.4837, lng: 127.0324 },
  { code: "11680", name: "강남구", lat: 37.5172, lng: 127.0473 },
  { code: "11710", name: "송파구", lat: 37.5146, lng: 127.105 },
  { code: "11740", name: "강동구", lat: 37.5301, lng: 127.1238 },
];

/** 국토부 실거래가 API 기본 URL */
export const TRADE_API_BASE_URL =
  "http://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
