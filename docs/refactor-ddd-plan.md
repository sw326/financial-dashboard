# DDD+SSOT 리팩토링 계획서 (CHM-273)

## 목표
flat 구조 → 도메인 주도 설계 (기능 중단 없이 점진적)

## 최종 목표 구조
```
app/                    ← Next.js 라우팅 (변경 최소화)
features/               ← 도메인별 코드 (NEW)
  market/               components/ hooks/ types.ts
  stock/                components/ hooks/ types.ts
  real-estate/          components/ hooks/ constants.ts types.ts
  watchlist/            components/ hooks/ types.ts
  chat/                 components/ hooks/ lib/ types.ts
  auth/                 components/ hooks/ types.ts
  notifications/        hooks/
shared/
  ui/                   ← shadcn (현재 components/ui/ 이동)
  supabase/             ← SSOT: browser.ts / server.ts / admin.ts
  lib/                  ← utils.ts, types.ts (공유 타입만)
  hooks/                ← use-mobile.ts 등 전역 훅
```

## 실행 순서
- [x] CHM-274: 데드코드 삭제 (chat-sidebar.tsx, sparkline.tsx)
- [x] CHM-275: Supabase SSOT → lib/supabase/ 통합 (4→3파일)
- [x] CHM-276: market 도메인 (hooks + components)
- [x] CHM-277: stock 도메인
- [x] CHM-278: real-estate 도메인
- [x] CHM-279: watchlist + chat + auth 도메인
- [x] CHM-281: 타입/상수 정리

## 마이그레이션 원칙
1. 각 단계마다 `tsc --noEmit` 통과 확인
2. Vercel 프리뷰로 기능 검증 후 머지
3. import 경로: `@/features/{domain}/...` 사용
4. `@/shared/supabase/...` 로 Supabase 접근

by 🦞
