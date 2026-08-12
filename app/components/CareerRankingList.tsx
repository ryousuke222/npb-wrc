"use client";

import Link from "next/link";
import type { CareerBatter } from "@/lib/career";
import { readableOnLight, teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus, wrcPlusTextColor } from "@/lib/wrc";
import { competitionRanks } from "@/lib/ranking";
import TeamBadge from "./TeamBadge";

export default function CareerRankingList({ careers }: { careers: CareerBatter[] }) {
  if (careers.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">
        条件に一致する打者がいません。通算打席数または期間を調整してみてください。
      </p>
    );
  }

  const displayRanks = competitionRanks(careers, (career) =>
    fmtWrcPlus(career.wrcPlus)
  );

  return (
    <ol className="flex flex-col gap-2.5">
      {careers.map((career, index) => {
        const displayPos = displayRanks[index];
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
                backgroundColor: withAlpha(color.bg, 0.1),
              }}
              className="flex items-center gap-3 rounded-xl border border-l-[6px] border-zinc-200/80 px-3 py-2.5 transition-transform hover:-translate-y-0.5 hover:shadow-sm sm:py-3"
            >
              <span
                style={{
                  backgroundColor: withAlpha(color.bg, 0.14),
                  color: readableOnLight(color.bg),
                  boxShadow: `inset 0 0 0 2px ${withAlpha(color.bg, 0.38)}`,
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold tabular-nums sm:h-11 sm:w-11 sm:text-lg"
              >
                {displayPos}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold tracking-tight text-zinc-950 sm:text-lg">
                  {career.name}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                  <TeamBadge teamId={highlightSeason.teamId} name={highlightSeason.teamName} />
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
                <span className={`block text-2xl font-extrabold leading-none tabular-nums sm:text-3xl ${wrcPlusTextColor(career.wrcPlus)}`}>
                  {fmtWrcPlus(career.wrcPlus)}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-zinc-600">
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
