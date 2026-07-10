"use client";

import { useMemo, useState } from "react";
import type { BatterRanking } from "@/lib/types";
import { ALL_TEAM_IDS, TEAM_ID_DEFAULT_NAME, type TeamId } from "@/lib/teams";
import RankingList from "./RankingList";

type Scope = "all" | "central" | "pacific" | `team:${TeamId}`;

const LEAGUE_TEAMS: { league: "central" | "pacific"; label: string }[] = [
  { league: "central", label: "セ・リーグ" },
  { league: "pacific", label: "パ・リーグ" },
];

const PAGE_SIZE = 100;

export default function AllTimeView({ batters }: { batters: BatterRanking[] }) {
  const [scope, setScope] = useState<Scope>("all");
  const [includeUnqualified, setIncludeUnqualified] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const scoped = useMemo(() => {
    let list = batters;
    if (!includeUnqualified) list = list.filter((b) => b.qualified);
    if (scope === "central" || scope === "pacific") {
      list = list.filter((b) => b.league === scope);
    } else if (scope.startsWith("team:")) {
      const teamId = scope.slice("team:".length) as TeamId;
      list = list.filter((b) => b.teamId === teamId);
    }
    return [...list].sort((a, b) => b.wrcPlus - a.wrcPlus);
  }, [batters, scope, includeUnqualified]);

  const visible = scoped.slice(0, visibleCount);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
            {ALL_TEAM_IDS.map((id) => (
              <option key={id} value={`team:${id}`}>
                {TEAM_ID_DEFAULT_NAME[id]}
              </option>
            ))}
          </optgroup>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={includeUnqualified}
            onChange={(e) => {
              setIncludeUnqualified(e.target.checked);
              setVisibleCount(PAGE_SIZE);
            }}
            className="h-4 w-4 rounded border-zinc-300"
          />
          規定打席未満のシーズンも含める
        </label>
      </div>

      <p className="mb-3 text-xs text-zinc-400">
        {scoped.length}シーズン中 上位{visible.length}件を表示中
      </p>

      <RankingList batters={visible} showYear />

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
