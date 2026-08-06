"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const MORE_NAV_ITEMS = [
  { href: "/compare", label: "選手比較", matches: (pathname: string) => pathname === "/compare" },
  { href: "/titles", label: "タイトル", matches: (pathname: string) => pathname === "/titles" },
  { href: "/team-best-nine", label: "ベスト9", matches: (pathname: string) => pathname === "/team-best-nine" },
  { href: "/records", label: "記録", matches: (pathname: string) => pathname === "/records" },
  { href: "/park-factors", label: "PF", matches: (pathname: string) => pathname === "/park-factors" },
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
    { href: "/monthly", label: "月間", matches: (path: string) => path === "/monthly" },
    { href: "/team-wrc", label: "チーム", matches: (path: string) => path === "/team-wrc" },
    { href: "/search", label: "選手検索", matches: (path: string) => path === "/search" },
  ];
  const mobileNavItems = [
    { href: "/", label: "ホーム", symbol: "⌂", matches: (path: string) => path === "/" },
    { href: "/latest", label: "最新", symbol: "●", matches: (path: string) => path === "/latest" },
    { href: `/year/${latestYear}`, label: "年度別", symbol: "年", matches: (path: string) => path.startsWith("/year/") },
    { href: "/all-time", label: "歴代", symbol: "史", matches: (path: string) => path === "/all-time" },
  ];
  const moreIsActive = MORE_NAV_ITEMS.some((item) => item.matches(pathname));
  const mobileMoreIsActive = !mobileNavItems.some((item) => item.matches(pathname));

  return (
    <>
      <nav className="hidden items-center gap-4 text-sm lg:flex" aria-label="メインメニュー">
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
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
                className={`rounded-lg px-3 py-2 text-sm ${item.matches(pathname) ? "bg-zinc-100 font-bold text-zinc-950" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </nav>

      <div className="lg:hidden">
        {isOpen && (
          <>
            <button type="button" aria-label="メニューを閉じる" onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-zinc-950/20" />
            <nav id="mobile-main-menu" aria-label="その他のメニュー" className="fixed inset-x-3 bottom-[4.5rem] z-50 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl">
              <p className="px-2 pb-2 text-xs font-bold text-zinc-500">そのほかのページ</p>
              <div className="grid grid-cols-2 gap-1">
                {[...primaryNavItems.filter((item) => !mobileNavItems.some((mobile) => mobile.href === item.href)), ...MORE_NAV_ITEMS].map((item) => {
                  const active = item.matches(pathname);
                  return <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} aria-current={active ? "page" : undefined} className={`rounded-xl px-3 py-3 text-sm ${active ? "bg-zinc-100 font-bold text-zinc-950" : "font-medium text-zinc-600 hover:bg-zinc-50"}`}>{item.label}</Link>;
                })}
              </div>
            </nav>
          </>
        )}
        <nav className="fixed inset-x-0 bottom-0 z-[60] grid grid-cols-5 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md" aria-label="スマートフォン用メニュー">
          {mobileNavItems.map((item) => {
            const active = item.matches(pathname);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${active ? "text-zinc-950" : "text-zinc-600"}`}><span aria-hidden="true" className={`text-base leading-none ${active ? "text-sky-700" : "text-zinc-500"}`}>{item.symbol}</span>{item.label}</Link>;
          })}
          <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-controls="mobile-main-menu" className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${isOpen || mobileMoreIsActive ? "text-zinc-950" : "text-zinc-600"}`}><span aria-hidden="true" className={`text-lg leading-none ${isOpen || mobileMoreIsActive ? "text-sky-700" : "text-zinc-500"}`}>…</span>もっと</button>
        </nav>
      </div>
    </>
  );
}
