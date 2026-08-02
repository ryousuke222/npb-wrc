"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const MORE_NAV_ITEMS = [
  { href: "/monthly", label: "月間", matches: (pathname: string) => pathname === "/monthly" },
  { href: "/team-wrc", label: "チーム", matches: (pathname: string) => pathname === "/team-wrc" },
  { href: "/titles", label: "タイトル", matches: (pathname: string) => pathname === "/titles" },
  { href: "/team-best-nine", label: "ベスト9", matches: (pathname: string) => pathname === "/team-best-nine" },
  { href: "/search", label: "検索", matches: (pathname: string) => pathname === "/search" },
  { href: "/about", label: "このサイト", matches: (pathname: string) => pathname === "/about" },
];

function linkClass(active: boolean): string {
  return active
    ? "font-bold text-zinc-950"
    : "text-zinc-600 hover:text-zinc-900";
}

export default function HeaderNav({ latestYear }: { latestYear: number }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const primaryNavItems = [
    { href: "/latest", label: "最新", matches: (path: string) => path === "/latest" },
    { href: `/year/${latestYear}`, label: "年度別", matches: (path: string) => path.startsWith("/year/") },
    { href: "/all-time", label: "歴代", matches: (path: string) => path === "/all-time" },
    { href: "/compare", label: "比較", matches: (path: string) => path === "/compare" },
  ];
  const moreIsActive = MORE_NAV_ITEMS.some((item) => item.matches(pathname));

  return (
    <>
      <nav className="hidden items-center gap-3 text-sm md:flex" aria-label="メインメニュー">
        {primaryNavItems.map((item) => {
          const active = item.matches(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`border-b-2 py-1 transition-colors ${
                active ? "border-zinc-900" : "border-transparent"
              } ${linkClass(active)}`}
            >
              {item.label}
            </Link>
          );
        })}
        <details className="relative">
          <summary className={`cursor-pointer list-none border-b-2 py-1 transition-colors ${moreIsActive ? "border-zinc-900 font-bold text-zinc-950" : "border-transparent text-zinc-600 hover:text-zinc-900"}`}>
            もっと <span className="text-[10px]">▼</span>
          </summary>
          <div className="absolute right-0 top-8 z-20 grid w-48 gap-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
            {MORE_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-2 text-sm ${item.matches(pathname) ? "bg-zinc-100 font-bold text-zinc-950" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="mobile-main-menu"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
        >
          {isOpen ? "閉じる" : "メニュー"}
        </button>
        {isOpen && (
          <nav
            id="mobile-main-menu"
            aria-label="メインメニュー"
            className="absolute inset-x-0 top-full border-b border-zinc-200 bg-white px-4 py-3 shadow-lg"
          >
            <div className="mx-auto max-w-5xl">
              <p className="px-3 pb-1 pt-1 text-[10px] font-bold tracking-wider text-zinc-400">メイン</p>
              <div className="grid grid-cols-2 gap-1">
              {primaryNavItems.map((item) => {
                const active = item.matches(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-2.5 text-sm ${
                      active ? "bg-zinc-100 font-bold text-zinc-950" : linkClass(false)
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              </div>
              <p className="px-3 pb-1 pt-4 text-[10px] font-bold tracking-wider text-zinc-400">もっと見る</p>
              <div className="grid grid-cols-2 gap-1">
              {MORE_NAV_ITEMS.map((item) => {
                const active = item.matches(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-3 py-2.5 text-sm ${
                      active ? "bg-zinc-100 font-bold text-zinc-950" : linkClass(false)
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              </div>
            </div>
          </nav>
        )}
      </div>
    </>
  );
}
