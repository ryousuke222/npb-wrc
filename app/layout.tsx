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

// 実際のデプロイ先ドメインで環境変数を設定すること（未設定時のプレースホルダーのままでは
// OG画像等の絶対URLが正しくならない。app/sitemap.tsのSITE_URLと同じ変数）
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "NPB最強打者ランキング(wRC+)",
  description:
    "wRC+をもとにしたNPB(日本プロ野球)の年度別・最強打者ランキング。データはNPB公式サイトの公開成績を元に独自算出しています。",
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto flex max-w-5xl flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6">
            <Link href="/" className="flex min-w-0 items-baseline gap-1.5">
              <span className="truncate text-base font-bold tracking-tight sm:text-lg">
                NPB最強打者ランキング
              </span>
              <span className="shrink-0 text-xs font-medium text-zinc-500">
                wRC+
              </span>
            </Link>
            <nav className="flex shrink-0 items-center gap-3 text-xs sm:gap-4 sm:text-sm">
              <Link href="/" className="text-zinc-600 hover:text-zinc-900">
                年度別ランキング
              </Link>
              <Link
                href="/all-time"
                className="text-zinc-600 hover:text-zinc-900"
              >
                歴代ランキング
              </Link>
              <Link
                href="/team-wrc"
                className="text-zinc-600 hover:text-zinc-900"
              >
                チームwRC+
              </Link>
              <Link
                href="/search"
                className="text-zinc-600 hover:text-zinc-900"
              >
                選手検索
              </Link>
              <Link
                href="/about"
                className="text-zinc-600 hover:text-zinc-900"
              >
                このサイトについて
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
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
