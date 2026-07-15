"use client";

import Link from "next/link";
import type { CareerBatter } from "@/lib/career";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

const MEDAL_RING: Record<number, string> = {
  1: "ring-2 ring-yellow-400",
  2: "ring-2 ring-zinc-400",
  3: "ring-2 ring-amber-600",
};

function wrcColor(value: number): string {
  if (value >= 160) return "text-red-600";
  if (value >= 130) return "text-orange-600";
  if (value >= 100) return "text-zinc-900";
  return "text-zinc-500";
}

export default function CareerRankingList({ careers }: { careers: CareerBatter[] }) {
  if (careers.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">
        条件に一致する打者がいません。通算打席数または期間を調整してみてください。
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {careers.map((career, index) => {
        const displayPos = index + 1;
        const best = career.bestQualifiedSeason;
        // 通算の球団表記・チームカラーは、カードに表示するキャリアハイの年で統一する。
        // 規定到達年がない場合だけ、最後の出場シーズンへフォールバックする。
        const highlightSeason = best ?? career.latestSeason;
        const color = teamColor(highlightSeason.teamId);

        return (
          <li key={career.id}>
            <Link
              href={`/year/${highlightSeason.year}/${highlightSeason.rank}?from=all-time`}
              onClick={() => {
                window.sessionStorage.setItem(
                  `player-return:${highlightSeason.year}:${highlightSeason.rank}`,
                  "history"
                );
              }}
              style={{
                borderLeftColor: color.bg,
                backgroundColor: withAlpha(color.bg, 0.07),
              }}
              className="flex items-center gap-3 rounded-xl border border-l-[6px] border-zinc-200/70 py-3 pr-4 pl-3 transition-transform hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:py-4 sm:pr-5"
            >
              <span
                style={{ backgroundColor: color.bg, color: color.on }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold tabular-nums shadow-sm sm:h-11 sm:w-11 sm:text-lg ${MEDAL_RING[displayPos] ?? ""}`}
              >
                {displayPos}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold tracking-tight sm:text-xl">
                  {career.name}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                  <span
                    style={{
                      backgroundColor: withAlpha(color.bg, 0.16),
                      color: color.bg,
                    }}
                    className="rounded-full px-2 py-0.5 font-bold"
                  >
                    {highlightSeason.teamName}
                  </span>
                  <span>{career.firstYear}〜{career.lastYear}</span>
                  <span>{career.seasons}年</span>
                  <span>通算 {career.pa.toLocaleString()}打席</span>
                  <span>120以上 {career.seasonsAt120}年</span>
                </span>
                {best && (
                  <span className="mt-1 block text-[10px] text-zinc-400">
                    最高 {best.year}年 {fmtWrcPlus(best.wrcPlus)}（規定到達）
                  </span>
                )}
              </span>

              <span className="shrink-0 text-right">
                <span className={`block text-2xl font-extrabold tabular-nums sm:text-3xl ${wrcColor(career.wrcPlus)}`}>
                  {fmtWrcPlus(career.wrcPlus)}
                </span>
                <span className="block text-[10px] font-medium tracking-wide text-zinc-400">
                  通算wRC+
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
