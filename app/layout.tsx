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
  title: "서울 아파트 실거래가",
  description: "서울시 아파트 실거래가 시각화",
};

const NAV_ITEMS = [
  { href: "/", label: "🗺️ 지도" },
  { href: "/trend", label: "📈 시세추이" },
  { href: "/recent", label: "🕐 최근거래" },
  { href: "/rank", label: "🏆 순위" },
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
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
            <span className="font-bold text-lg">🏠 실거래가</span>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
