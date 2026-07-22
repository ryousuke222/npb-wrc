"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "年度別", matches: (pathname: string) => pathname === "/" || pathname.startsWith("/year/") },
  { href: "/latest", label: "最新", matches: (pathname: string) => pathname === "/latest" },
  { href: "/all-time", label: "歴代", matches: (pathname: string) => pathname === "/all-time" },
  { href: "/team-wrc", label: "チーム", matches: (pathname: string) => pathname === "/team-wrc" },
  { href: "/titles", label: "タイトル", matches: (pathname: string) => pathname === "/titles" },
  { href: "/team-best-nine", label: "ベスト9", matches: (pathname: string) => pathname === "/team-best-nine" },
  { href: "/search", label: "検索", matches: (pathname: string) => pathname === "/search" },
  { href: "/compare", label: "比較", matches: (pathname: string) => pathname === "/compare" },
  { href: "/about", label: "このサイト", matches: (pathname: string) => pathname === "/about" },
];

function linkClass(active: boolean): string {
  return active
    ? "font-bold text-zinc-950"
    : "text-zinc-600 hover:text-zinc-900";
}

export default function HeaderNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-3 text-sm sm:flex" aria-label="メインメニュー">
        {NAV_ITEMS.map((item) => {
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
      </nav>

      <div className="sm:hidden">
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
            <div className="mx-auto grid max-w-5xl grid-cols-2 gap-1">
              {NAV_ITEMS.map((item) => {
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
          </nav>
        )}
      </div>
    </>
  );
}
