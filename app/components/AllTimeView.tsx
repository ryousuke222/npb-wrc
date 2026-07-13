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

  const availableAges = useMemo(() => {
    const ages = new Set<number>();
    for (const b of batters) {
      if (b.age !== undefined) ages.add(b.age);
    }
    return [...ages].sort((a, b) => a - b);
  }, [batters]);

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
  const [includeUnqualified, setIncludeUnqualified] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [fromYear, setFromYear] = useState(oldestYear);
  const [toYear, setToYear] = useState(newestYear);
  const [ageFilterInput, setAgeFilterInput] = useState("");

  const ageFilter = ageFilterInput === "" ? null : Number(ageFilterInput);

  const scoped = useMemo(() => {
    let list = batters;
    if (!includeUnqualified) list = list.filter((b) => b.qualified);
    if (scope === "central" || scope === "pacific") {
      list = list.filter((b) => b.league === scope);
    } else if (scope.startsWith("team:")) {
      const teamId = scope.slice("team:".length) as TeamId;
      list = list.filter((b) => b.teamId === teamId);
    }
    list = list.filter((b) => b.year >= fromYear && b.year <= toYear);
    if (activeOnly) list = list.filter((b) => activeNames.has(b.name));
    if (ageFilter !== null) list = list.filter((b) => b.age === ageFilter);
    return [...list].sort((a, b) => b.wrcPlus - a.wrcPlus);
  }, [batters, scope, includeUnqualified, fromYear, toYear, activeOnly, activeNames, ageFilter]);

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

        <div className="flex items-center gap-1.5 text-sm">
          <select
            value={fromYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setFromYear(y);
              if (y > toYear) setToYear(y);
              setVisibleCount(PAGE_SIZE);
            }}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-medium"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
          <span className="text-zinc-400">〜</span>
          <select
            value={toYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setToYear(y);
              if (y < fromYear) setFromYear(y);
              setVisibleCount(PAGE_SIZE);
            }}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 font-medium"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
          {(fromYear !== oldestYear || toYear !== newestYear) && (
            <button
              type="button"
              onClick={() => {
                setFromYear(oldestYear);
                setToYear(newestYear);
                setVisibleCount(PAGE_SIZE);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-700"
            >
              リセット
            </button>
          )}
        </div>

        <select
          value={ageFilterInput}
          onChange={(e) => {
            setAgeFilterInput(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
        >
          <option value="">年齢: 指定なし</option>
          {availableAges.map((age) => (
            <option key={age} value={age}>
              {age}歳
            </option>
          ))}
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

      <p className="mb-3 text-xs text-zinc-400">
        {scoped.length}シーズン中 上位{visible.length}件を表示中
      </p>

      <RankingList batters={visible} showYear backQuery="from=all-time" />

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
