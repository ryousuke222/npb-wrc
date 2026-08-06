import Link from "next/link";

export default function RankingHubNav({
  current,
  year,
}: {
  current: "year" | "all-time";
  year: number;
}) {
  const items = [
    {
      key: "year" as const,
      href: `/year/${year}`,
      label: "年度別ランキング",
      detail: "1年ごとの打者を比較",
    },
    {
      key: "all-time" as const,
      href: "/all-time",
      label: "歴代ランキング",
      detail: "全シーズン・通算を比較",
    },
  ];

  return (
    <nav
      aria-label="ランキングの表示切り替え"
      className="mb-5 grid grid-cols-2 gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-100/80 p-1.5 sm:mb-6"
    >
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-xl border px-3 py-3 transition-colors sm:px-4 ${
              active
                ? "border-sky-200 bg-white text-zinc-950 shadow-sm"
                : "border-transparent text-zinc-500 hover:bg-white/70 hover:text-zinc-800"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-extrabold sm:text-base">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${active ? "bg-sky-600" : "bg-zinc-300"}`}
              />
              {item.label}
            </span>
            <span className="mt-1 hidden pl-4 text-xs text-zinc-500 sm:block">
              {item.detail}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
