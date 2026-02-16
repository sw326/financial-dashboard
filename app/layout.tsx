import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { NavMenu } from "./nav-menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "증시 & 부동산 실거래가 시각화 대시보드",
  openGraph: {
    title: "Financial Dashboard",
    description: "증시 & 부동산 실거래가 시각화 대시보드",
  },
};

export const NAV_GROUPS = [
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
        <nav className="border-b bg-background sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Link href="/" className="font-bold text-lg mr-4 hover:opacity-80 transition-opacity">
                💰 Financial Dashboard
              </Link>
              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                >
                  대시보드
                </Link>
                <span className="mx-1 text-border">|</span>
                {NAV_GROUPS.map((group, gi) => (
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
                    {gi < NAV_GROUPS.length - 1 && <span className="mx-1 text-border">|</span>}
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile hamburger */}
            <NavMenu />
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
