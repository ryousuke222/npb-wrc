"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BatterRanking, LeagueKey } from "@/lib/types";
import { teamColor, withAlpha } from "@/lib/teamColors";
import RankingList from "./RankingList";

function fmtRate(n: number): string {
  return n.toFixed(3).replace(/^0\./, ".");
}

type StatKey = "avg" | "hits" | "hr" | "rbi" | "obp" | "sb";

const flatColor = () => "text-zinc-900";

const STATS: {
  key: StatKey;
  label: string;
  requireQualified: boolean;
  getValue: (b: BatterRanking) => number;
  formatValue: (n: number) => string;
}[] = [
  {
    key: "avg",
    label: "首位打者",
    requireQualified: true,
    getValue: (b) => b.avg,
    formatValue: fmtRate,
  },
  {
    key: "hits",
    label: "最多安打",
    requireQualified: false,
    getValue: (b) => b.hits,
    formatValue: (n) => String(n),
  },
  {
    key: "hr",
    label: "最多本塁打",
    requireQualified: false,
    getValue: (b) => b.hr,
    formatValue: (n) => String(n),
  },
  {
    key: "rbi",
    label: "最多打点",
    requireQualified: false,
    getValue: (b) => b.rbi,
    formatValue: (n) => String(n),
  },
  {
    key: "obp",
    label: "最高出塁率",
    requireQualified: true,
    getValue: (b) => b.obp,
    formatValue: fmtRate,
  },
  {
    key: "sb",
    label: "最多盗塁",
    requireQualified: false,
    getValue: (b) => b.sb,
    formatValue: (n) => String(n),
  },
];

const LEAGUES: { key: LeagueKey; label: string }[] = [
  { key: "central", label: "セ・リーグ" },
  { key: "pacific", label: "パ・リーグ" },
];

const LIST_SIZE = 1;

/** ベストナインの対象ポジション（投手部門は対象外） */
const BEST_NINE_POSITIONS = ["捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"];

/** ベストナインカードの丸バッジに表示する短縮ラベル */
const POSITION_SHORT_LABEL: Record<string, string> = {
  捕手: "捕",
  一塁手: "一",
  二塁手: "二",
  三塁手: "三",
  遊撃手: "遊",
  外野手: "外",
};

export default function TitleRankingView({
  batters,
  years,
  initialYear,
  latestSeasonComplete,
}: {
  batters: BatterRanking[];
  years: number[];
  initialYear: number;
  latestSeasonComplete: boolean;
}) {
  const [year, setYear] = useState(initialYear);

  const yearBatters = useMemo(() => batters.filter((b) => b.year === year), [batters, year]);

  const leagues = useMemo(
    () =>
      LEAGUES.map((league) => {
        const leagueBatters = yearBatters.filter((b) => b.league === league.key);
        const stats = STATS.map((stat) => {
          const pool = stat.requireQualified
            ? leagueBatters.filter((b) => b.qualified)
            : leagueBatters;
          const ranked = [...pool]
            .sort((a, b) => stat.getValue(b) - stat.getValue(a))
            .slice(0, LIST_SIZE);
          return { ...stat, ranked };
        });
        const bestNine = BEST_NINE_POSITIONS.map((position) => ({
          position,
          winners: leagueBatters.filter((b) => b.bestNinePosition === position),
        }));
        return { ...league, stats, bestNine };
      }),
    [yearBatters]
  );

  const hasBestNine = leagues.some((league) =>
    league.bestNine.some((p) => p.winners.length > 0)
  );

  return (
    <div>
      <div className="mb-4">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="表示年度"
          className="ui-control px-3 py-1.5 text-sm font-medium"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
      </div>

      {leagues.map((league) => (
        <div key={league.key} className="mb-8">
          <h2 className="mb-3 text-base font-bold tracking-tight">{league.label}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {league.stats.map((stat) => (
              <div key={stat.key}>
                <h3 className="mb-2 text-sm font-bold text-zinc-700">{stat.label}</h3>
                <RankingList
                  batters={stat.ranked}
                  backQuery="from=titles"
                  valueLabel={stat.label}
                  getValue={stat.getValue}
                  formatValue={stat.formatValue}
                  showTitles={false}
                  getValueColor={flatColor}
                />
              </div>
            ))}
          </div>

          {league.bestNine.some((p) => p.winners.length > 0) && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold text-zinc-700">ベストナイン</h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {league.bestNine.flatMap(({ position, winners }) =>
                  winners.map((b) => {
                    const color = teamColor(b.teamId);
                    return (
                      <Link
                        key={`${position}-${b.name}-${b.teamId}`}
                        href={`/year/${b.year}/${b.rank}?from=titles`}
                        onClick={() => {
                          window.sessionStorage.setItem(
                            `player-return:${b.year}:${b.rank}`,
                            "history"
                          );
                        }}
                        style={{
                          borderLeftColor: color.bg,
                          backgroundColor: withAlpha(color.bg, 0.07),
                        }}
                        className="flex items-center gap-2.5 rounded-2xl border border-l-[5px] border-zinc-200/70 py-2 pr-3 pl-2.5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <span
                          style={{ backgroundColor: color.bg, color: color.on }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold"
                        >
                          {POSITION_SHORT_LABEL[position] ?? position}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{b.name}</span>
                          <span
                            style={{
                              backgroundColor: withAlpha(color.bg, 0.16),
                              color: color.bg,
                            }}
                            className="mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                          >
                            {b.teamName}
                          </span>
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {!hasBestNine && (
        <p className="text-xs text-zinc-400">
          {year === initialYear && !latestSeasonComplete
            ? "今シーズンのベストナインは、シーズン終了後の発表にあわせて反映します。"
            : "この年度のベストナインデータはありません（2002年以降のみ対応）。"}
        </p>
      )}
    </div>
  );
}
