"use client";

import { useMemo, useState } from "react";
import type { BatterRanking } from "@/lib/types";
import { fmtWrcPlus } from "@/lib/wrc";
import RankingList from "./RankingList";

function fmtRate(n: number): string {
  return n.toFixed(3).replace(/^0\./, ".");
}

type ColumnKey = "avg" | "wrcPlus" | "hr";

const flatColor = () => "text-zinc-900";

const COLUMNS: {
  key: ColumnKey;
  label: string;
  requireQualified: boolean;
  getValue: (b: BatterRanking) => number;
  formatValue: (n: number) => string;
  getValueColor?: (n: number) => string;
}[] = [
  {
    key: "avg",
    label: "打率ランキング",
    requireQualified: true,
    getValue: (b) => b.avg,
    formatValue: fmtRate,
    getValueColor: flatColor,
  },
  {
    key: "wrcPlus",
    label: "wRC+ランキング",
    requireQualified: true,
    getValue: (b) => b.wrcPlus,
    formatValue: fmtWrcPlus,
  },
  {
    key: "hr",
    label: "本塁打ランキング",
    requireQualified: false,
    getValue: (b) => b.hr,
    formatValue: (n) => String(n),
    getValueColor: flatColor,
  },
];

const LIST_SIZE = 10;

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

  const columns = useMemo(
    () =>
      COLUMNS.map((col) => {
        const pool = col.requireQualified
          ? yearBatters.filter((b) => b.qualified)
          : yearBatters;
        const ranked = [...pool].sort((a, b) => col.getValue(b) - col.getValue(a)).slice(0, LIST_SIZE);
        return { ...col, ranked };
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {columns.map((col) => (
          <div key={col.key}>
            <h2 className="mb-2 text-sm font-bold text-zinc-700">{col.label}</h2>
            <RankingList
              batters={col.ranked}
              backQuery="from=all-time"
              valueLabel={col.label.replace("ランキング", "")}
              getValue={col.getValue}
              formatValue={col.formatValue}
              showTitles={false}
              {...(col.getValueColor ? { getValueColor: col.getValueColor } : {})}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
