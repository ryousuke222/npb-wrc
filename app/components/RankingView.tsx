"use client";

import { useMemo, useState } from "react";
import type { BatterRanking } from "@/lib/types";
import {
  ALL_TEAM_IDS,
  HISTORICAL_ONLY_TEAM_IDS,
  TEAM_ID_DEFAULT_NAME,
  type TeamId,
} from "@/lib/teams";
import { STAT_OPTIONS, getStatOption, type StatKey } from "@/lib/statOptions";
import RankingList from "./RankingList";

export type Scope = "all" | "central" | "pacific" | `team:${TeamId}`;
type AgeMode = "eq" | "gte" | "lte";

const LEAGUE_TEAMS: { league: "central" | "pacific"; label: string }[] = [
  { league: "central", label: "セ・リーグ" },
  { league: "pacific", label: "パ・リーグ" },
];

const TEAM_ID_DISPLAY_ORDER: TeamId[] = [...ALL_TEAM_IDS, ...HISTORICAL_ONLY_TEAM_IDS];

const ROUND_PRESETS = [300, 200, 100, 50, 0];

const POSITION_ORDER = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "内野手", "外野手"];

export default function RankingView({
  batters,
  regulationPaThreshold,
  initialScope = "all",
  initialMinPa = regulationPaThreshold,
  hideScopeFilter = false,
  playerBackQuery,
}: {
  batters: BatterRanking[];
  regulationPaThreshold: number;
  initialScope?: Scope;
  initialMinPa?: number;
  /** 既にチーム等で絞り込んだ打者一覧を渡す場合、冗長なリーグ/球団セレクタを隠す */
  hideScopeFilter?: boolean;
  /** 選手詳細ページの「戻る」リンクを遷移元に向けるためのクエリ文字列（例: "from=team&teamId=G"） */
  playerBackQuery?: string;
}) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [minPa, setMinPa] = useState(initialMinPa);
  const [minPaInput, setMinPaInput] = useState(String(initialMinPa));
  const [statKey, setStatKey] = useState<StatKey>("wrcPlus");
  const stat = getStatOption(statKey);
  const [ageFilterInput, setAgeFilterInput] = useState("");
  const [ageMode, setAgeMode] = useState<AgeMode>("eq");
  const [batsFilter, setBatsFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const ageFilter = ageFilterInput === "" ? null : Number(ageFilterInput);

  // その年度に実際に在籍データがある球団のみをセレクタに出す
  // （楽天のように後年発足した球団を過去の年度に表示しない等）
  const teamsInScope = useMemo(() => {
    const present = new Set(batters.map((b) => b.teamId));
    return TEAM_ID_DISPLAY_ORDER.filter((id) => present.has(id));
  }, [batters]);

  const positionsInScope = useMemo(() => {
    const present = new Set(batters.map((b) => b.position).filter((p): p is string => !!p));
    return POSITION_ORDER.filter((p) => present.has(p));
  }, [batters]);

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

  const filtered = useMemo(() => {
    let list = scoped.filter((b) => b.pa >= minPa);
    if (ageFilter !== null) {
      if (ageMode === "eq") list = list.filter((b) => b.age === ageFilter);
      else if (ageMode === "gte") list = list.filter((b) => b.age !== undefined && b.age >= ageFilter);
      else list = list.filter((b) => b.age !== undefined && b.age <= ageFilter);
    }
    if (batsFilter) list = list.filter((b) => b.bats === batsFilter);
    if (positionFilter) list = list.filter((b) => b.position === positionFilter);
    return [...list].sort((a, b) => stat.getValue(b) - stat.getValue(a));
  }, [scoped, minPa, stat, ageFilter, ageMode, batsFilter, positionFilter]);

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
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {!hideScopeFilter && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                絞り込み
              </label>
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
                  {teamsInScope.map((id) => (
                    <option key={id} value={`team:${id}`}>
                      {TEAM_ID_DEFAULT_NAME[id]}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">
              並び替え
            </label>
            <select
              value={statKey}
              onChange={(e) => setStatKey(e.target.value as StatKey)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
            >
              {STAT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}順
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="min-pa" className="mb-1 block text-[11px] font-medium text-zinc-400">
              最低打席数
            </label>
            <div className="flex items-center gap-1.5">
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
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">年齢</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={ageFilterInput}
                onChange={(e) => setAgeFilterInput(e.target.value)}
                placeholder="指定なし"
                className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums"
              />
              <select
                value={ageMode}
                onChange={(e) => setAgeMode(e.target.value as AgeMode)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm font-medium"
              >
                <option value="eq">のみ</option>
                <option value="gte">以上</option>
                <option value="lte">以下</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">打</label>
            <select
              value={batsFilter}
              onChange={(e) => setBatsFilter(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
            >
              <option value="">指定なし</option>
              <option value="右">右打ち</option>
              <option value="左">左打ち</option>
              <option value="両">両打ち</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">
              ポジション
            </label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
            >
              <option value="">指定なし</option>
              {positionsInScope.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
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
      </div>

      <p className="mb-3 text-xs text-zinc-400">{filtered.length}名を表示中</p>

      <RankingList
        batters={filtered}
        backQuery={playerBackQuery}
        valueLabel={stat.label}
        getValue={stat.getValue}
        formatValue={stat.formatValue}
        {...(stat.flatColor ? { getValueColor: () => "text-zinc-900" } : {})}
      />
    </div>
  );
}
