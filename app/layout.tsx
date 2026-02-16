import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "금융 대시보드",
  description: "부동산 실거래가 & 증시 시각화",
};

const NAV_GROUPS = [
  {
    label: "🏠 부동산",
    items: [
      { href: "/", label: "지도" },
      { href: "/trend", label: "시세추이" },
      { href: "/recent", label: "최근거래" },
      { href: "/rank", label: "순위" },
    ],
  },
  {
    label: "📈 증시",
    items: [
      { href: "/market", label: "시장개요" },
      { href: "/stock", label: "종목차트" },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b bg-background">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-1">
            <span className="font-bold text-lg mr-4">💰 금융 대시보드</span>
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex items-center gap-1">
                <span className="text-xs font-medium text-muted-foreground/60 mr-1">{group.label}</span>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
                <span className="mx-2 text-border">|</span>
              </div>
            ))}
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
