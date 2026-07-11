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
import YearRangeSlider from "./YearRangeSlider";

type Scope = "all" | "central" | "pacific" | `team:${TeamId}`;

const LEAGUE_TEAMS: { league: "central" | "pacific"; label: string }[] = [
  { league: "central", label: "セ・リーグ" },
  { league: "pacific", label: "パ・リーグ" },
];

const DISPLAY_TEAM_IDS: TeamId[] = [...ALL_TEAM_IDS, ...HISTORICAL_ONLY_TEAM_IDS];
const PAGE_SIZE = 100;

function wrcColor(v: number): string {
  if (v >= 130) return "text-red-600";
  if (v >= 115) return "text-orange-600";
  if (v >= 85) return "text-zinc-900";
  return "text-zinc-500";
}

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

  const scoped = useMemo(() => {
    let list = entries;
    if (scope === "central" || scope === "pacific") {
      list = list.filter((e) => e.league === scope);
    } else if (scope.startsWith("team:")) {
      const teamId = scope.slice("team:".length) as TeamId;
      list = list.filter((e) => e.teamId === teamId);
    }
    list = list.filter((e) => e.year >= fromYear && e.year <= toYear);
    return [...list].sort((a, b) => b.wrcPlus - a.wrcPlus);
  }, [entries, scope, fromYear, toYear]);

  const visible = scoped.slice(0, visibleCount);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
                    className={`block text-2xl font-extrabold tabular-nums sm:text-3xl ${wrcColor(e.wrcPlus)}`}
                  >
                    {fmtWrcPlus(e.wrcPlus)}
                  </span>
                  <span className="block text-[10px] font-medium tracking-wide text-zinc-400">
                    チームwRC+
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
