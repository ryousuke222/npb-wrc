"use client";

import { useMemo, useState } from "react";
import type { BatterRanking, LeagueKey } from "@/lib/types";
import RankingList from "./RankingList";

function fmtRate(n: number): string {
  return n.toFixed(3).replace(/^0\./, ".");
}

type StatKey = "avg" | "hr" | "rbi";

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
    label: "打率",
    requireQualified: true,
    getValue: (b) => b.avg,
    formatValue: fmtRate,
  },
  {
    key: "hr",
    label: "本塁打",
    requireQualified: false,
    getValue: (b) => b.hr,
    formatValue: (n) => String(n),
  },
  {
    key: "rbi",
    label: "打点",
    requireQualified: false,
    getValue: (b) => b.rbi,
    formatValue: (n) => String(n),
  },
];

const LEAGUES: { key: LeagueKey; label: string }[] = [
  { key: "central", label: "セ・リーグ" },
  { key: "pacific", label: "パ・リーグ" },
];

const LIST_SIZE = 5;

export default function TitleRankingView({
  batters,
  years,
  initialYear,
}: {
  batters: BatterRanking[];
  years: number[];
  initialYear: number;
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
        return { ...league, stats };
      }),
    [yearBatters]
  );

  return (
    <div>
      <div className="mb-4">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {league.stats.map((stat) => (
              <div key={stat.key}>
                <h3 className="mb-2 text-sm font-bold text-zinc-700">{stat.label}</h3>
                <RankingList
                  batters={stat.ranked}
                  backQuery="from=all-time"
                  valueLabel={stat.label}
                  getValue={stat.getValue}
                  formatValue={stat.formatValue}
                  showTitles={false}
                  getValueColor={flatColor}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
