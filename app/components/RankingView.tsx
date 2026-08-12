"use client";

import { useMemo, useRef, useState } from "react";
import type { BatterRanking } from "@/lib/types";
import {
  ALL_TEAM_IDS,
  HISTORICAL_ONLY_TEAM_IDS,
  TEAM_ID_DEFAULT_NAME,
  type TeamId,
} from "@/lib/teams";
import { STAT_OPTIONS, getStatOption, type StatKey } from "@/lib/statOptions";
import RankingList from "./RankingList";
import FilterStatusBar from "./FilterStatusBar";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const ageFilter = ageFilterInput === "" ? null : Number(ageFilterInput);
  const hasCustomFilters =
    scope !== initialScope ||
    minPa !== initialMinPa ||
    statKey !== "wrcPlus" ||
    ageFilterInput !== "" ||
    batsFilter !== "" ||
    positionFilter !== "";
  const customFilterCount = [
    scope !== initialScope,
    minPa !== initialMinPa,
    statKey !== "wrcPlus",
    ageFilterInput !== "",
    batsFilter !== "",
    positionFilter !== "",
  ].filter(Boolean).length;

  // その年度に実際に在籍データがある球団のみをセレクタに出す
  // （楽天のように後年発足した球団を過去の年度に表示しない等）
  const teamsInScope = useMemo(() => {
    const present = new Set(batters.map((b) => b.teamId));
    return TEAM_ID_DISPLAY_ORDER.filter((id) => present.has(id));
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

  const positionsInScope = useMemo(() => {
    const present = new Set(scoped.map((b) => b.position).filter((p): p is string => !!p));
    return POSITION_ORDER.filter((p) => present.has(p));
  }, [scoped]);

  const detailDataAvailability = useMemo(
    () => ({
      age: scoped.some((batter) => batter.age !== undefined),
      bats: scoped.some((batter) => batter.bats),
      position: positionsInScope.length > 0,
    }),
    [scoped, positionsInScope]
  );

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
    const normalized = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    setMinPa(normalized);
    setMinPaInput(String(normalized));
  };

  const resetFilters = () => {
    setScope(initialScope);
    setMinPa(initialMinPa);
    setMinPaInput(String(initialMinPa));
    setStatKey("wrcPlus");
    setAgeFilterInput("");
    setAgeMode("eq");
    setBatsFilter("");
    setPositionFilter("");
  };

  const scopeLabel =
    scope === "all"
      ? "総合"
      : scope === "central"
        ? "セ・リーグ"
        : scope === "pacific"
          ? "パ・リーグ"
          : TEAM_ID_DEFAULT_NAME[scope.slice("team:".length) as TeamId];
  const ageModeLabel = ageMode === "eq" ? "" : ageMode === "gte" ? "以上" : "以下";
  const conditionLabels = [
    ...(ageFilterInput ? [`${ageFilterInput}歳${ageModeLabel}`] : []),
    ...(batsFilter ? [`${batsFilter}打ち`] : []),
    ...(positionFilter ? [positionFilter] : []),
  ];
  const conditionSummary = `${scopeLabel}・${minPa === 0 ? "全打者" : `${minPa}打席以上`}・${stat.label}順`;

  const closeFiltersAndShowResults = () => {
    setShowMobileFilters(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const results = resultsRef.current;
        if (!results) return;
        results.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
        results.focus({ preventScroll: true });
      });
    });
  };

  return (
    <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="mb-4 lg:sticky lg:top-20 lg:mb-0">
        <button
          type="button"
          onClick={() => setShowMobileFilters((show) => !show)}
          aria-expanded={showMobileFilters}
          aria-controls="year-ranking-filters"
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 lg:hidden"
        >
          <span>絞り込み・並び替え</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            {filtered.length}名{customFilterCount > 0 ? `・${customFilterCount}条件` : ""}
            <span aria-hidden="true">{showMobileFilters ? "▲" : "▼"}</span>
          </span>
        </button>
        <div
          id="year-ranking-filters"
          className={`${showMobileFilters ? "mt-2 block" : "hidden"} rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4 lg:mt-0 lg:block lg:shadow-none`}
        >
          <div className="mb-3 hidden items-center justify-between border-b border-zinc-100 pb-3 lg:flex">
            <h2 className="text-sm font-bold text-zinc-900">表示条件</h2>
            <span className="text-[11px] text-zinc-500">ランキングを絞り込む</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {!hideScopeFilter && (
            <div>
              <label htmlFor="ranking-scope" className="mb-1.5 block text-xs font-bold text-zinc-600">
                対象
              </label>
              <select
                id="ranking-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as Scope)}
                className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-800 lg:min-h-10"
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
            <label htmlFor="ranking-stat" className="mb-1.5 block text-xs font-bold text-zinc-600">
              指標
            </label>
            <select
              id="ranking-stat"
              value={statKey}
              onChange={(e) => setStatKey(e.target.value as StatKey)}
              className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-800 lg:min-h-10"
            >
              {STAT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}順
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold text-zinc-600">打席条件</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => selectMinPa(regulationPaThreshold)}
                aria-pressed={minPa === regulationPaThreshold}
                className={`min-h-11 rounded-lg border px-2 text-xs font-bold transition-colors lg:min-h-10 ${
                  minPa === regulationPaThreshold
                    ? "border-sky-700 bg-sky-700 text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                規定打席
              </button>
              <button
                type="button"
                onClick={() => selectMinPa(0)}
                aria-pressed={minPa === 0}
                className={`min-h-11 rounded-lg border px-2 text-xs font-bold transition-colors lg:min-h-10 ${
                  minPa === 0
                    ? "border-sky-700 bg-sky-700 text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                全打者
              </button>
            </div>
          </div>

          {showAdvanced && (
            <>
              <div>
                <label htmlFor="min-pa" className="mb-1.5 block text-xs font-bold text-zinc-600">
                  最低打席数を指定
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
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-right text-sm font-bold tabular-nums lg:min-h-10"
                  />
                  <span className="text-xs font-medium text-zinc-500">打席以上</span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {presets
                    .filter((preset) => preset !== regulationPaThreshold && preset !== 0)
                    .map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => selectMinPa(preset)}
                        aria-pressed={minPa === preset}
                        className={`min-h-9 rounded-md text-xs font-bold transition-colors ${
                          minPa === preset
                            ? "bg-sky-700 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                </div>
              </div>
              {detailDataAvailability.age && (
                <fieldset>
                  <legend className="mb-1.5 block text-xs font-bold text-zinc-600">年齢</legend>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="ranking-age"
                      aria-label="年齢"
                      type="number"
                      min={0}
                      value={ageFilterInput}
                      onChange={(e) => setAgeFilterInput(e.target.value)}
                      placeholder="指定なし"
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-right text-sm tabular-nums lg:min-h-10"
                    />
                    <select
                      aria-label="年齢条件"
                      value={ageMode}
                      onChange={(e) => setAgeMode(e.target.value as AgeMode)}
                      className="min-h-11 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium lg:min-h-10"
                    >
                      <option value="eq">のみ</option>
                      <option value="gte">以上</option>
                      <option value="lte">以下</option>
                    </select>
                  </div>
                </fieldset>
              )}

              {detailDataAvailability.bats && (
                <div>
                  <label htmlFor="ranking-bats" className="mb-1.5 block text-xs font-bold text-zinc-600">左右打ち</label>
                  <select
                    id="ranking-bats"
                    value={batsFilter}
                    onChange={(e) => setBatsFilter(e.target.value)}
                    className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium lg:min-h-10"
                  >
                    <option value="">指定なし</option>
                    <option value="右">右打ち</option>
                    <option value="左">左打ち</option>
                    <option value="両">両打ち</option>
                  </select>
                </div>
              )}

              {detailDataAvailability.position && (
                <div>
                  <label htmlFor="ranking-position" className="mb-1.5 block text-xs font-bold text-zinc-600">
                    ポジション
                  </label>
                  <select
                    id="ranking-position"
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium lg:min-h-10"
                  >
                    <option value="">指定なし</option>
                    {positionsInScope.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!detailDataAvailability.age &&
                !detailDataAvailability.bats &&
                !detailDataAvailability.position && (
                  <p className="text-xs leading-5 text-zinc-400">
                    この年度・範囲では詳細条件用の選手属性データを準備中です。
                  </p>
                )}
            </>
          )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 lg:flex-col lg:items-stretch">
            <button
              type="button"
              onClick={() => setShowAdvanced((show) => !show)}
              aria-expanded={showAdvanced}
              className="rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              {showAdvanced ? "詳細条件を閉じる" : "詳細条件"}
            </button>
            {hasCustomFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              >
                条件をリセット
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={closeFiltersAndShowResults}
            className="mt-3 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white lg:hidden"
          >
            この条件でランキングを見る（{filtered.length}名）
          </button>
        </div>
      </div>

      <div
        ref={resultsRef}
        id="year-ranking-results"
        tabIndex={-1}
        className="min-w-0 scroll-mt-20 outline-none"
      >
        <FilterStatusBar
          title={`${stat.label}ランキング`}
          resultLabel={`${filtered.length}名を表示中`}
          summary={conditionSummary}
          conditions={conditionLabels}
          canReset={hasCustomFilters}
          onReset={resetFilters}
        />

        <RankingList
          batters={filtered}
          backQuery={playerBackQuery}
          valueLabel={stat.label}
          getValue={stat.getValue}
          formatValue={stat.formatValue}
          {...(stat.flatColor ? { getValueColor: () => "text-zinc-900" } : {})}
        />
      </div>
    </div>
  );
}
