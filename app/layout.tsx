import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import HeaderNav from "./components/HeaderNav";
import ScrollRestoration from "./components/ScrollRestoration";
import { getLatestYear } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "NPB最強打者ランキング(wRC+)",
  description:
    "wRC+をもとにしたNPB(日本プロ野球)の年度別・最強打者ランキング。データはNPB公式サイトの公開成績を元に独自算出しています。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: "NPB最強打者ランキング",
    title: "NPB最強打者ランキング(wRC+)",
    description: "最新シーズンから歴代まで、NPB打者の得点創出力をwRC+で比較。",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const latestYear = await getLatestYear();

  return (
    <html lang="ja" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col overflow-x-hidden bg-zinc-50 pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-zinc-900 lg:pb-0">
        <Suspense fallback={null}>
          <ScrollRestoration />
        </Suspense>
        <a href="#main-content" className="skip-link">本文へ移動</a>
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-base font-bold tracking-tight sm:text-lg">
                NPB最強打者ランキング
              </span>
              <span className="shrink-0 text-xs font-medium text-zinc-500">
                wRC+
              </span>
            </Link>
            <HeaderNav latestYear={latestYear} />
          </div>
        </header>
        <main id="main-content" className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 bg-white px-4 py-6 text-center text-xs text-zinc-500">
          <p>
            成績データ出典:{" "}
            <a
              href="https://npb.jp/bis/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              NPB.jp 日本野球機構
            </a>
            （個人打撃成績・チーム打撃成績）
          </p>
          <p className="mt-1">
            wRC+は当サイトによる独自の簡易算出値です。詳細は
            <Link href="/about" className="underline underline-offset-2">
              こちら
            </Link>
            。
          </p>
        </footer>
      </body>
    </html>
  );
}
