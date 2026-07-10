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

const ROUND_PRESETS = [300, 200, 100, 50, 0];

export default function RankingView({
  batters,
  regulationPaThreshold,
}: {
  batters: BatterRanking[];
  regulationPaThreshold: number;
}) {
  const [scope, setScope] = useState<Scope>("all");
  const [minPa, setMinPa] = useState(regulationPaThreshold);
  const [minPaInput, setMinPaInput] = useState(String(regulationPaThreshold));

  const presets = useMemo(() => {
    const values = [regulationPaThreshold, ...ROUND_PRESETS].filter(
      (v) => v <= regulationPaThreshold
    );
    return [...new Set(values)];
  }, [regulationPaThreshold]);

  const scoped = useMemo(() => {
    if (scope === "all") return batters;
    if (scope === "central" || scope === "pacific") {
      return batters.filter((b) => b.league === scope);
    }
    const teamId = scope.slice("team:".length) as TeamId;
    return batters.filter((b) => b.teamId === teamId);
  }, [batters, scope]);

  const filtered = useMemo(
    () => scoped.filter((b) => b.pa >= minPa),
    [scoped, minPa]
  );

  const selectMinPa = (n: number) => {
    setMinPa(n);
    setMinPaInput(String(n));
  };

  const commitMinPa = () => {
    const n = Number(minPaInput);
    setMinPa(Number.isFinite(n) && n >= 0 ? n : 0);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
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

        <input
          id="min-pa"
          type="number"
          min={0}
          value={minPaInput}
          onChange={(e) => setMinPaInput(e.target.value)}
          onBlur={commitMinPa}
          onKeyDown={(e) => e.key === "Enter" && commitMinPa()}
          className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums"
        />
        <span className="text-xs text-zinc-400">打席以上</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-zinc-400">最低打席数:</span>
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectMinPa(p)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              minPa === p
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {p === regulationPaThreshold ? `規定打席(${p})` : p === 0 ? "全打者" : p}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-zinc-400">{filtered.length}名を表示中</p>

      <RankingList batters={filtered} />
    </div>
  );
}
