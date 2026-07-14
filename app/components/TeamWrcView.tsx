"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { TeamWrcEntry } from "@/lib/data";
import {
  ALL_TEAM_IDS,
  HISTORICAL_ONLY_TEAM_IDS,
  TEAM_ID_DEFAULT_NAME,
  type TeamId,
} from "@/lib/teams";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";
import { fmtRate } from "@/lib/statOptions";
import YearRangeSlider from "./YearRangeSlider";

type Scope = "all" | "central" | "pacific" | `team:${TeamId}`;
type TeamStatKey = "wrcPlus" | "avg" | "obp" | "slg" | "ops" | "hr" | "rbi" | "sb";

const LEAGUE_TEAMS: { league: "central" | "pacific"; label: string }[] = [
  { league: "central", label: "セ・リーグ" },
  { league: "pacific", label: "パ・リーグ" },
];

const DISPLAY_TEAM_IDS: TeamId[] = [...ALL_TEAM_IDS, ...HISTORICAL_ONLY_TEAM_IDS];
const PAGE_SIZE = 100;

const flatColor = () => "text-zinc-900";

const TEAM_STAT_OPTIONS: {
  key: TeamStatKey;
  label: string;
  getValue: (e: TeamWrcEntry) => number;
  formatValue: (n: number) => string;
  getColor: (n: number) => string;
}[] = [
  {
    key: "wrcPlus",
    label: "チームwRC+",
    getValue: (e) => e.wrcPlus,
    formatValue: fmtWrcPlus,
    getColor: (v) => {
      if (v >= 130) return "text-red-600";
      if (v >= 115) return "text-orange-600";
      if (v >= 85) return "text-zinc-900";
      return "text-zinc-500";
    },
  },
  {
    key: "avg",
    label: "チーム打率",
    getValue: (e) => e.avg,
    formatValue: fmtRate,
    getColor: flatColor,
  },
  {
    key: "obp",
    label: "チーム出塁率",
    getValue: (e) => e.obp,
    formatValue: fmtRate,
    getColor: flatColor,
  },
  {
    key: "slg",
    label: "チーム長打率",
    getValue: (e) => e.slg,
    formatValue: fmtRate,
    getColor: flatColor,
  },
  {
    key: "ops",
    label: "チームOPS",
    getValue: (e) => e.ops,
    formatValue: fmtRate,
    getColor: flatColor,
  },
  {
    key: "hr",
    label: "チーム本塁打",
    getValue: (e) => e.hr,
    formatValue: (n) => String(n),
    getColor: flatColor,
  },
  {
    key: "rbi",
    label: "チーム打点",
    getValue: (e) => e.rbi,
    formatValue: (n) => String(n),
    getColor: flatColor,
  },
  {
    key: "sb",
    label: "チーム盗塁",
    getValue: (e) => e.sb,
    formatValue: (n) => String(n),
    getColor: flatColor,
  },
];

function parseScope(v: string | null): Scope | null {
  if (!v) return null;
  if (v === "all" || v === "central" || v === "pacific") return v;
  if (v.startsWith("team:") && DISPLAY_TEAM_IDS.includes(v.slice(5) as TeamId)) {
    return v as Scope;
  }
  return null;
}

/**
 * チーム選手一覧ページ(TeamBackLink)からの戻り遷移で、直前の絞り込み状態
 * (scope/from/to)をURLクエリから復元する。チームwRC+一覧へのリンク自体は
 * このコンポーネントが逐次組み立てるため、アドレスバー自体を常に同期する
 * 必要はない。
 */
export default function TeamWrcView({ entries }: { entries: TeamWrcEntry[] }) {
  const searchParams = useSearchParams();
  const years = useMemo(
    () => [...new Set(entries.map((e) => e.year))].sort((a, b) => a - b),
    [entries]
  );
  const oldestYear = years[0];
  const newestYear = years[years.length - 1];

  const [scope, setScope] = useState<Scope>(
    () => parseScope(searchParams.get("scope")) ?? "all"
  );
  const [fromYear, setFromYear] = useState(() => {
    const n = Number(searchParams.get("from"));
    return Number.isFinite(n) && n > 0 ? n : oldestYear;
  });
  const [toYear, setToYear] = useState(() => {
    const n = Number(searchParams.get("to"));
    return Number.isFinite(n) && n > 0 ? n : newestYear;
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [statKey, setStatKey] = useState<TeamStatKey>("wrcPlus");
  const stat = TEAM_STAT_OPTIONS.find((s) => s.key === statKey) ?? TEAM_STAT_OPTIONS[0];

  const scoped = useMemo(() => {
    let list = entries;
    if (scope === "central" || scope === "pacific") {
      list = list.filter((e) => e.league === scope);
    } else if (scope.startsWith("team:")) {
      const teamId = scope.slice("team:".length) as TeamId;
      list = list.filter((e) => e.teamId === teamId);
    }
    list = list.filter((e) => e.year >= fromYear && e.year <= toYear);
    return [...list].sort((a, b) => stat.getValue(b) - stat.getValue(a));
  }, [entries, scope, fromYear, toYear, stat]);

  const visible = scoped.slice(0, visibleCount);

  return (
    <div>
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">
              絞り込み
            </label>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as Scope);
                setVisibleCount(PAGE_SIZE);
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
            >
              <option value="all">総合</option>
              <optgroup label="リーグ">
                {LEAGUE_TEAMS.map((l) => (
                  <option key={l.league} value={l.league}>
                    {l.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="球団">
                {DISPLAY_TEAM_IDS.map((id) => (
                  <option key={id} value={`team:${id}`}>
                    {TEAM_ID_DEFAULT_NAME[id]}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">
              並び替え
            </label>
            <select
              value={statKey}
              onChange={(e) => {
                setStatKey(e.target.value as TeamStatKey);
                setVisibleCount(PAGE_SIZE);
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
            >
              {TEAM_STAT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}順
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">期間</label>
            <YearRangeSlider
              min={oldestYear}
              max={newestYear}
              fromYear={fromYear}
              toYear={toYear}
              onChange={(from, to) => {
                setFromYear(from);
                setToYear(to);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-zinc-400">
        {scoped.length}チームシーズン中 上位{visible.length}件を表示中
      </p>

      <ol className="flex flex-col gap-2.5">
        {visible.map((e, i) => {
          const displayPos = i + 1;
          const color = teamColor(e.teamId);
          const backQs = new URLSearchParams({
            scope,
            from: String(fromYear),
            to: String(toYear),
          }).toString();
          return (
            <li key={`${e.year}-${e.teamId}`}>
              <Link
                href={`/year/${e.year}/team/${e.teamId}?${backQs}`}
                style={{
                  borderLeftColor: color.bg,
                  backgroundColor: withAlpha(color.bg, 0.07),
                }}
                className="flex items-center gap-3 rounded-xl border border-l-[6px] border-zinc-200/70 py-3 pr-4 pl-3 transition-transform hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:py-4 sm:pr-5"
              >
                <span
                  style={{ backgroundColor: color.bg, color: color.on }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold tabular-nums shadow-sm sm:h-11 sm:w-11 sm:text-lg"
                >
                  {displayPos}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold tracking-tight sm:text-xl">
                    {e.year}年 {e.teamName}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-400">
                      {e.league === "central" ? "セ・リーグ" : "パ・リーグ"}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {e.pa}打席
                    </span>
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span
                    className={`block text-2xl font-extrabold tabular-nums sm:text-3xl ${stat.getColor(stat.getValue(e))}`}
                  >
                    {stat.formatValue(stat.getValue(e))}
                  </span>
                  <span className="block text-[10px] font-medium tracking-wide text-zinc-400">
                    {stat.label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {visibleCount < scoped.length && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200"
          >
            さらに{Math.min(PAGE_SIZE, scoped.length - visibleCount)}件表示
          </button>
        </div>
      )}
    </div>
  );
}
