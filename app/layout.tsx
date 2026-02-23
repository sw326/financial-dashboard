import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import SearchCommand from "@/components/search-command";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthButton } from "@/components/auth-button"
import { Toaster } from "sonner"
import { BarChart3, Building2, MessageSquare } from "lucide-react";

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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Financial Dashboard",
    description: "증시 & 부동산 실거래가 시각화 대시보드",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const sidebarOpen = sidebarState === undefined ? true : sidebarState === "true";
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <TooltipProvider>
              <SidebarProvider defaultOpen={sidebarOpen}>
                <AppSidebar />
                <main className="w-full">
                  <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex h-14 items-center px-4 gap-2">
                      <SidebarTrigger />
                      <nav className="flex items-center gap-0.5 ml-1">
                        {[
                          { href: "/market",      icon: BarChart3,     label: "주식" },
                          { href: "/real-estate", icon: Building2,     label: "부동산" },
                          { href: "/chat",        icon: MessageSquare, label: "채팅" },
                        ].map(({ href, icon: Icon, label }) => (
                          <a
                            key={href}
                            href={href}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">{label}</span>
                          </a>
                        ))}
                      </nav>
                      <div className="flex-1" />
                      <div className="w-64">
                        <SearchCommand />
                      </div>
                      <ThemeToggle />
                      <AuthButton />
                    </div>
                  </div>
                  <div className="container mx-auto px-4 lg:px-6 py-6 max-w-7xl">
                    {children}
                  </div>
                </main>
              </SidebarProvider>
            </TooltipProvider>
          </QueryProvider>
        <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
