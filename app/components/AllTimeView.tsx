"use client";

import { useMemo, useState } from "react";
import { aggregateCareerBatters } from "@/lib/career";
import type { BatterRanking } from "@/lib/types";
import { ALL_TEAM_IDS, TEAM_ID_DEFAULT_NAME, type TeamId } from "@/lib/teams";
import { STAT_OPTIONS, getStatOption, type StatKey } from "@/lib/statOptions";
import RankingList from "./RankingList";
import CareerRankingList from "./CareerRankingList";
import YearRangeSlider from "./YearRangeSlider";

type Scope = "all" | "central" | "pacific" | `team:${TeamId}`;
type AgeMode = "eq" | "gte" | "lte";
type RankingMode = "season" | "career";

const LEAGUE_TEAMS: { league: "central" | "pacific"; label: string }[] = [
  { league: "central", label: "セ・リーグ" },
  { league: "pacific", label: "パ・リーグ" },
];

const PAGE_SIZE = 100;

const POSITION_ORDER = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "内野手", "外野手"];

// NPBを離れてMLBに在籍中の選手は当然NPBの支配下選手一覧には載らない。
// 手動で維持するリスト（要ソース確認・定期更新。削除ではなく引退確認まで残す）
// 参照: 2026年MLB日本人選手一覧（打者のみ、投手専業は対象外）
const MLB_ACTIVE_BATTER_NAMES = new Set([
  "大谷　翔平", // ドジャース（投打二刀流、NPB時代の打者成績も対象に含める）
  "鈴木　誠也", // カブス
  "村上　宗隆", // ホワイトソックス（2026年は3Aでリハビリ中）
  "岡本　和真", // ブルージェイズ
  "吉田　正尚", // レッドソックス
]);

export default function AllTimeView({
  batters,
  activeRosterNames,
}: {
  batters: BatterRanking[];
  activeRosterNames: string[];
}) {
  const years = useMemo(
    () => [...new Set(batters.map((b) => b.year))].sort((a, b) => a - b),
    [batters]
  );
  const oldestYear = years[0];
  const newestYear = years[years.length - 1];

  // NPB公式の支配下選手一覧（1軍/2軍・育成選手問わず現在登録されている選手）に
  // MLB在籍中の手動リストを足したものを「現役」とみなす（名前で判定するため、
  // 同姓同名選手が別にいる場合は誤って現役扱いになりうるが、既存の選手個人ページと
  // 同じ簡易的な名前ベースの識別方法に合わせている）
  const activeNames = useMemo(() => {
    const names = new Set(activeRosterNames);
    for (const name of MLB_ACTIVE_BATTER_NAMES) names.add(name);
    return names;
  }, [activeRosterNames]);

  const [scope, setScope] = useState<Scope>("all");
  const [rankingMode, setRankingMode] = useState<RankingMode>("season");
  const [includeUnqualified, setIncludeUnqualified] = useState(false);
  const [minimumCareerPa, setMinimumCareerPa] = useState(3000);
  const [activeOnly, setActiveOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [fromYear, setFromYear] = useState(oldestYear);
  const [toYear, setToYear] = useState(newestYear);
  const [ageFilterInput, setAgeFilterInput] = useState("");
  const [ageMode, setAgeMode] = useState<AgeMode>("eq");
  const [batsFilter, setBatsFilter] = useState("");
  const [statKey, setStatKey] = useState<StatKey>("wrcPlus");
  const stat = getStatOption(statKey);
  const [positionFilter, setPositionFilter] = useState("");

  const ageFilter = ageFilterInput === "" ? null : Number(ageFilterInput);

  const positionsInScope = useMemo(() => {
    const present = new Set(batters.map((b) => b.position).filter((p): p is string => !!p));
    return POSITION_ORDER.filter((p) => present.has(p));
  }, [batters]);

  const commonFiltered = useMemo(() => {
    let list = batters;
    if (scope === "central" || scope === "pacific") {
      list = list.filter((b) => b.league === scope);
    } else if (scope.startsWith("team:")) {
      const teamId = scope.slice("team:".length) as TeamId;
      list = list.filter((b) => b.teamId === teamId);
    }
    list = list.filter((b) => b.year >= fromYear && b.year <= toYear);
    if (activeOnly) list = list.filter((b) => activeNames.has(b.name));
    if (ageFilter !== null) {
      if (ageMode === "eq") list = list.filter((b) => b.age === ageFilter);
      else if (ageMode === "gte") list = list.filter((b) => b.age !== undefined && b.age >= ageFilter);
      else list = list.filter((b) => b.age !== undefined && b.age <= ageFilter);
    }
    if (batsFilter) list = list.filter((b) => b.bats === batsFilter);
    if (positionFilter) list = list.filter((b) => b.position === positionFilter);
    return list;
  }, [
    batters,
    scope,
    fromYear,
    toYear,
    activeOnly,
    activeNames,
    ageFilter,
    ageMode,
    batsFilter,
    positionFilter,
  ]);

  const scoped = useMemo(
    () =>
      [...(includeUnqualified ? commonFiltered : commonFiltered.filter((b) => b.qualified))].sort(
        (a, b) => stat.getValue(b) - stat.getValue(a)
      ),
    [commonFiltered, includeUnqualified, stat]
  );

  const careers = useMemo(
    () =>
      aggregateCareerBatters(commonFiltered)
        .filter((career) => career.pa >= minimumCareerPa)
        .sort((a, b) => b.wrcPlus - a.wrcPlus || b.pa - a.pa),
    [commonFiltered, minimumCareerPa]
  );

  const visibleSeasons = scoped.slice(0, visibleCount);
  const visibleCareers = careers.slice(0, visibleCount);
  const visibleCountForMode = rankingMode === "career" ? visibleCareers.length : visibleSeasons.length;
  const totalCount = rankingMode === "career" ? careers.length : scoped.length;

  return (
    <div>
      <div className="mb-4 flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
        <button
          type="button"
          onClick={() => {
            setRankingMode("season");
            setVisibleCount(PAGE_SIZE);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            rankingMode === "season" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          シーズン単位
        </button>
        <button
          type="button"
          onClick={() => {
            setRankingMode("career");
            setVisibleCount(PAGE_SIZE);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            rankingMode === "career" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          通算wRC+
        </button>
      </div>

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
                {ALL_TEAM_IDS.map((id) => (
                  <option key={id} value={`team:${id}`}>
                    {TEAM_ID_DEFAULT_NAME[id]}
                  </option>
                ))}
              </optgroup>
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

          {rankingMode === "season" ? (
            <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">
              並び替え
            </label>
            <select
              value={statKey}
              onChange={(e) => {
                setStatKey(e.target.value as StatKey);
                setVisibleCount(PAGE_SIZE);
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
            >
              {STAT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}順
                </option>
              ))}
            </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                通算打席
              </label>
              <select
                value={minimumCareerPa}
                onChange={(e) => {
                  setMinimumCareerPa(Number(e.target.value));
                  setVisibleCount(PAGE_SIZE);
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
              >
                <option value={1000}>1,000打席以上</option>
                <option value={3000}>3,000打席以上</option>
                <option value={5000}>5,000打席以上</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium text-zinc-400">年齢</label>
            <div className="flex items-center gap-1.5 text-sm">
              <input
                type="number"
                min={0}
                value={ageFilterInput}
                onChange={(e) => {
                  setAgeFilterInput(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="指定なし"
                className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right tabular-nums"
              />
              <select
                value={ageMode}
                onChange={(e) => {
                  setAgeMode(e.target.value as AgeMode);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-medium"
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
              onChange={(e) => {
                setBatsFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
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
              onChange={(e) => {
                setPositionFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
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

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-100 pt-3">
          {rankingMode === "season" ? (
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
          ) : (
            <p className="text-sm text-zinc-600">
              全シーズンを通算し、年度別wRC+を打席数で加重平均しています。
            </p>
          )}

          <label className="flex items-center gap-1.5 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => {
                setActiveOnly(e.target.checked);
                setVisibleCount(PAGE_SIZE);
              }}
              className="h-4 w-4 rounded border-zinc-300"
            />
            現役選手のみ（NPB支配下選手・MLB在籍中含む）
          </label>
        </div>
      </div>

      <p className="mb-3 text-xs text-zinc-400">
        {rankingMode === "career" ? `${totalCount}人中` : `${totalCount}シーズン中`} 上位{visibleCountForMode}件を表示中
      </p>

      {rankingMode === "career" ? (
        <CareerRankingList careers={visibleCareers} />
      ) : (
        <RankingList
          batters={visibleSeasons}
          showYear
          backQuery="from=all-time"
          valueLabel={stat.label}
          getValue={stat.getValue}
          formatValue={stat.formatValue}
          {...(stat.flatColor ? { getValueColor: () => "text-zinc-900" } : {})}
        />
      )}

      {visibleCount < totalCount && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200"
          >
            さらに{Math.min(PAGE_SIZE, totalCount - visibleCount)}件表示
          </button>
        </div>
      )}
    </div>
  );
}
