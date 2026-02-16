"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  {
    label: "📈 증시",
    items: [
      { href: "/market", label: "시장개요" },
      { href: "/stock", label: "종목차트" },
    ],
  },
  {
    label: "🏠 부동산",
    items: [
      { href: "/trend", label: "시세추이" },
      { href: "/recent", label: "최근거래" },
      { href: "/rank", label: "순위" },
    ],
  },
];

export function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        aria-label="메뉴"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      {open && (
        <div className="absolute top-14 left-0 right-0 bg-background border-b shadow-lg z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              🏠 대시보드
            </Link>
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground/60 px-3 mb-1">{group.label}</p>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                      pathname === item.href ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
