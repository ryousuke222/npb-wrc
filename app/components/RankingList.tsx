import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

const MEDAL_RING: Record<number, string> = {
  1: "ring-2 ring-yellow-400",
  2: "ring-2 ring-zinc-400",
  3: "ring-2 ring-amber-600",
};

function wrcColor(v: number): string {
  if (v >= 160) return "text-red-600";
  if (v >= 130) return "text-orange-600";
  if (v >= 100) return "text-zinc-900";
  return "text-zinc-500";
}

export default function RankingList({
  batters,
  showYear = false,
}: {
  batters: BatterRanking[];
  /** 年度をまたぐ一覧（歴代ランキング等）で、各行に年度を表示する */
  showYear?: boolean;
}) {
  if (batters.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">
        条件に一致する打者がいません。打席数の条件を下げてみてください。
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {batters.map((b, i) => {
        const displayPos = i + 1;
        const color = teamColor(b.teamId);
        const ring = MEDAL_RING[displayPos] ?? "";

        return (
          <li key={`${b.year}-${b.league}-${b.name}-${b.teamId}-${b.rank}`}>
            <Link
              href={`/year/${b.year}/${b.rank}`}
              style={{
                borderLeftColor: color.bg,
                backgroundColor: withAlpha(color.bg, 0.07),
              }}
              className="flex items-center gap-3 rounded-xl border border-l-[6px] border-zinc-200/70 py-3 pr-4 pl-3 transition-transform hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:py-4 sm:pr-5"
            >
              <span
                style={{ backgroundColor: color.bg, color: color.on }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold tabular-nums shadow-sm sm:h-11 sm:w-11 sm:text-lg ${ring}`}
              >
                {displayPos}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold tracking-tight sm:text-xl">
                  {b.name}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  {showYear && (
                    <span className="text-[11px] font-bold text-zinc-500">
                      {b.year}
                    </span>
                  )}
                  <span
                    style={{
                      backgroundColor: withAlpha(color.bg, 0.16),
                      color: color.bg,
                    }}
                    className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  >
                    {b.teamName}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-400">
                    {b.league === "central" ? "セ" : "パ"}
                  </span>
                  {!b.qualified && (
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                      規定未満
                    </span>
                  )}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span
                  className={`block text-2xl font-extrabold tabular-nums sm:text-3xl ${wrcColor(b.wrcPlus)}`}
                >
                  {fmtWrcPlus(b.wrcPlus)}
                </span>
                <span className="block text-[10px] font-medium tracking-wide text-zinc-400">
                  wRC+
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
