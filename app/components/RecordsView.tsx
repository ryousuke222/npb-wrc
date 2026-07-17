"use client";

import { useMemo, useState } from "react";
import type { BatterRanking } from "@/lib/types";
import { fmtRate } from "@/lib/statOptions";
import { fmtWrcPlus } from "@/lib/wrc";
import RankingList from "./RankingList";

type RecordKey = "wrcPlus" | "hr" | "hits" | "avg" | "ops";

const RECORD_OPTIONS: {
  key: RecordKey;
  label: string;
  note: string;
  qualifiedOnly?: boolean;
  getValue: (batter: BatterRanking) => number;
  formatValue: (value: number) => string;
}[] = [
  {
    key: "wrcPlus",
    label: "wRC+",
    note: "規定打席到達者",
    qualifiedOnly: true,
    getValue: (batter) => batter.wrcPlus,
    formatValue: fmtWrcPlus,
  },
  {
    key: "hr",
    label: "本塁打",
    note: "シーズン記録",
    getValue: (batter) => batter.hr,
    formatValue: (value) => `${value}本`,
  },
  {
    key: "hits",
    label: "安打",
    note: "シーズン記録",
    getValue: (batter) => batter.hits,
    formatValue: (value) => `${value}本`,
  },
  {
    key: "avg",
    label: "打率",
    note: "規定打席到達者",
    qualifiedOnly: true,
    getValue: (batter) => batter.avg,
    formatValue: fmtRate,
  },
  {
    key: "ops",
    label: "OPS",
    note: "規定打席到達者",
    qualifiedOnly: true,
    getValue: (batter) => batter.ops,
    formatValue: fmtRate,
  },
];

export default function RecordsView({ batters }: { batters: BatterRanking[] }) {
  const [recordKey, setRecordKey] = useState<RecordKey>("wrcPlus");
  const record = RECORD_OPTIONS.find((option) => option.key === recordKey) ?? RECORD_OPTIONS[0];

  const ranked = useMemo(
    () =>
      batters
        .filter((batter) => !record.qualifiedOnly || batter.qualified)
        .sort((a, b) => record.getValue(b) - record.getValue(a))
        .slice(0, 10),
    [batters, record]
  );

  return (
    <div>
      <div className="mb-4 flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        {RECORD_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setRecordKey(option.key)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-colors sm:px-3 sm:text-sm ${
              recordKey === option.key
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-zinc-900">歴代 {record.label}</h2>
        <span className="text-xs text-zinc-400">{record.note}・上位10</span>
      </div>

      <RankingList
        batters={ranked}
        showYear
        backQuery="from=records"
        valueLabel={record.label}
        getValue={record.getValue}
        formatValue={record.formatValue}
        getValueColor={() => "text-zinc-900"}
      />
    </div>
  );
}
