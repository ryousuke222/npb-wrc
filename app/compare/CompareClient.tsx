"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  CompareBatterRow,
  CompareIndex,
} from "@/lib/compare";
import { teamColor, withAlpha } from "@/lib/teamColors";
import type { TeamId } from "@/lib/teams";
import type { LeagueKey } from "@/lib/types";
import { fmtWrcPlus } from "@/lib/wrc";

interface CompareBatter {
  year: number;
  rank: number;
  name: string;
  teamId: TeamId;
  teamName: string;
  league: LeagueKey;
  qualified: boolean;
  wrcPlus: number;
  woba: number;
  parkFactor: number | null;
  pa: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  hr: number;
  rbi: number;
  sb: number;
  bb: number;
  so: number;
}

interface Metric {
  label: string;
  note?: string;
  getValue: (batter: CompareBatter) => number | null;
  format: (value: number) => string;
  better?: "higher" | "lower" | "none";
}

interface MetricGroup {
  label: string;
  description: string;
  metrics: Metric[];
}

function seasonId(batter: CompareBatter): string {
  return `${batter.year}-${batter.rank}`;
}

function expandRow(row: CompareBatterRow): CompareBatter {
  const [
    year,
    rank,
    name,
    teamId,
    teamName,
    league,
    qualified,
    wrcPlus,
    woba,
    parkFactor,
    pa,
    avg,
    obp,
    slg,
    ops,
    hr,
    rbi,
    sb,
    bb,
    so,
  ] = row;
  return {
    year,
    rank,
    name,
    teamId,
    teamName,
    league,
    qualified,
    wrcPlus,
    woba,
    parkFactor,
    pa,
    avg,
    obp,
    slg,
    ops,
    hr,
    rbi,
    sb,
    bb,
    so,
  };
}

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/[\s　]/g, "").toLowerCase();
}

function fmtRate(value: number): string {
  return value.toFixed(3).replace(/^0\./, ".");
}

function fmtSignedPercent(value: number): string {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function fmtPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function fmtParkFactor(value: number): string {
  const environment = value >= 1.005 ? "打者有利" : value <= 0.995 ? "投手有利" : "中立";
  return `${value.toFixed(3)}（${environment}）`;
}

const COMPARISON_HIGHLIGHTS: {
  label: string;
  getValue: (batter: CompareBatter) => number;
  format: (value: number) => string;
}[] = [
  { label: "総合", getValue: (batter) => batter.wrcPlus, format: fmtWrcPlus },
  { label: "OPS", getValue: (batter) => batter.ops, format: fmtRate },
  { label: "本塁打", getValue: (batter) => batter.hr, format: (value) => `${value}本` },
  {
    label: "選球眼",
    getValue: (batter) => (batter.pa > 0 ? batter.bb / batter.pa : 0),
    format: fmtPercent,
  },
];

const METRIC_GROUPS: MetricGroup[] = [
  {
    label: "総合評価",
    description: "リーグ・球場の違いを補正した打撃評価",
    metrics: [
      {
        label: "wRC+",
        note: "リーグ平均100",
        getValue: (b) => b.wrcPlus,
        format: fmtWrcPlus,
      },
      {
        label: "wOBA",
        note: "打撃の得点価値",
        getValue: (b) => b.woba,
        format: fmtRate,
      },
    ],
  },
  {
    label: "打撃の質",
    description: "長打力・選球眼・三振の傾向",
    metrics: [
      {
        label: "ISO",
        note: "長打力",
        getValue: (b) => b.slg - b.avg,
        format: fmtRate,
      },
      {
        label: "BB%",
        note: "四球 ÷ 打席",
        getValue: (b) => (b.pa > 0 ? b.bb / b.pa : null),
        format: fmtPercent,
      },
      {
        label: "K%",
        note: "三振 ÷ 打席",
        getValue: (b) => (b.pa > 0 ? b.so / b.pa : null),
        format: fmtPercent,
        better: "lower",
      },
      {
        label: "BB/K",
        note: "四球 ÷ 三振",
        getValue: (b) => (b.so > 0 ? b.bb / b.so : null),
        format: (value) => value.toFixed(2),
      },
    ],
  },
  {
    label: "打撃成績",
    description: "実際に残した率・量の成績",
    metrics: [
      {
        label: "打席",
        note: "サンプル量",
        getValue: (b) => b.pa,
        format: (value) => String(value),
        better: "none",
      },
      { label: "打率", getValue: (b) => b.avg, format: fmtRate },
      { label: "出塁率", getValue: (b) => b.obp, format: fmtRate },
      { label: "長打率", getValue: (b) => b.slg, format: fmtRate },
      { label: "OPS", getValue: (b) => b.ops, format: fmtRate },
      { label: "本塁打", getValue: (b) => b.hr, format: (value) => String(value) },
      { label: "打点", getValue: (b) => b.rbi, format: (value) => String(value) },
      { label: "盗塁", getValue: (b) => b.sb, format: (value) => String(value) },
    ],
  },
  {
    label: "打撃環境",
    description: "選手の優劣ではなく、その年に立った球場の傾向",
    metrics: [
      {
        label: "実効PF",
        note: "1.000が中立",
        getValue: (b) => b.parkFactor,
        format: fmtParkFactor,
        better: "none",
      },
    ],
  },
];

export default function CompareClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [index, setIndex] = useState<CompareIndex | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const batters = useMemo(
    () => (index?.rows ?? []).map(expandRow),
    [index]
  );
  const presets = index?.presets ?? [];
  const batterById = useMemo(
    () => new Map(batters.map((batter) => [seasonId(batter), batter])),
    [batters]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const ids = (searchParams.get("players") ?? "")
      .split(",")
      .filter(Boolean)
      .slice(0, 3);
    return [...new Set(ids)];
  });
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/compare-index.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<CompareIndex>;
      })
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSelectedIds = useMemo(() => {
    if (!index) return selectedIds;
    const valid = selectedIds.filter((id) => batterById.has(id)).slice(0, 3);
    return valid.length > 0 ? valid : (index.presets[0]?.ids ?? []).slice(0, 3);
  }, [batterById, index, selectedIds]);

  const selected = useMemo(
    () =>
      activeSelectedIds
        .map((id) => batterById.get(id))
        .filter((batter): batter is CompareBatter => batter !== undefined),
    [activeSelectedIds, batterById]
  );

  const matches = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];

    return batters
      .map((batter) => {
        const name = normalize(batter.name);
        const haystack = `${name}${batter.year}${normalize(batter.teamName)}`;
        let score = 4;
        if (name === q) score = 0;
        else if (name.startsWith(q)) score = 1;
        else if (name.includes(q)) score = 2;
        else if (haystack.includes(q)) score = 3;
        return { batter, score };
      })
      .filter(({ score }) => score < 4)
      .sort(
        (a, b) =>
          a.score - b.score ||
          Number(b.batter.qualified) - Number(a.batter.qualified) ||
          b.batter.year - a.batter.year
      )
      .slice(0, 12)
      .map(({ batter }) => batter);
  }, [batters, query]);

  useEffect(() => {
    if (!index) return;
    const nextValue = activeSelectedIds.join(",");
    if ((searchParams.get("players") ?? "") === nextValue) return;

    const params = new URLSearchParams(searchParams.toString());
    if (nextValue) params.set("players", nextValue);
    else params.delete("players");
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [activeSelectedIds, index, pathname, router, searchParams]);

  const addSeason = (batter: CompareBatter) => {
    const id = seasonId(batter);
    if (activeSelectedIds.includes(id) || activeSelectedIds.length >= 3) return;
    setSelectedIds([...activeSelectedIds, id]);
    setQuery("");
  };

  if (!index) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-16 text-center text-sm text-zinc-400">
        {loadFailed
          ? "比較データを読み込めませんでした。ページを再読み込みしてください。"
          : "比較データを読み込んでいます..."}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold tracking-wide text-zinc-400">
            おすすめ比較
          </span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSelectedIds(preset.ids.slice(0, 3))}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="relative mt-5">
          <label htmlFor="compare-search" className="text-sm font-bold text-zinc-700">
            比較する選手・年度を追加
          </label>
          <input
            id="compare-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={activeSelectedIds.length >= 3}
            placeholder={
              activeSelectedIds.length >= 3
                ? "最大3シーズンまで選択できます"
                : "選手名・年度・球団名で検索（例：大谷 2016）"
            }
            className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-zinc-500 disabled:bg-zinc-100 disabled:text-zinc-400"
          />

          {query.trim() && activeSelectedIds.length < 3 && (
            <div className="absolute z-10 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
              {matches.length > 0 ? (
                matches.map((batter) => {
                  const id = seasonId(batter);
                  const isSelected = activeSelectedIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => addSeason(batter)}
                      disabled={isSelected}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-50 disabled:opacity-40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {batter.name}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {batter.year}年・{batter.teamName}
                          {!batter.qualified && "・規定未満"}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-extrabold tabular-nums text-zinc-700">
                        {fmtWrcPlus(batter.wrcPlus)}
                        <span className="ml-1 text-[10px] font-medium text-zinc-400">
                          wRC+
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-6 text-center text-sm text-zinc-400">
                  一致する選手シーズンがありません。
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`mt-6 grid gap-4 ${selected.length >= 3 ? "lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        {selected.map((batter) => {
          const id = seasonId(batter);
          const color = teamColor(batter.teamId);
          return (
            <article
              key={id}
              style={{
                borderTopColor: color.bg,
                backgroundImage: `linear-gradient(180deg, ${withAlpha(color.bg, 0.09)}, transparent 110px)`,
              }}
              className="relative rounded-2xl border border-t-[5px] border-zinc-200 bg-white p-5"
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(activeSelectedIds.filter((value) => value !== id))
                }
                aria-label={`${batter.name} ${batter.year}年を比較から外す`}
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-sm text-zinc-400 hover:bg-white hover:text-zinc-700"
              >
                ×
              </button>
              <p className="text-xs font-bold text-zinc-400">{batter.year}年</p>
              <h2 className="mt-0.5 pr-7 text-xl font-extrabold tracking-tight">
                {batter.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  style={{
                    backgroundColor: withAlpha(color.bg, 0.16),
                    color: color.bg,
                  }}
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                >
                  {batter.teamName}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {batter.league === "central" ? "セ" : "パ"}・
                  {batter.qualified ? "規定到達" : "規定未満"}
                </span>
              </div>
              <div className="mt-5 flex items-end gap-1.5">
                <span className="text-4xl font-extrabold tabular-nums text-red-600">
                  {fmtWrcPlus(batter.wrcPlus)}
                </span>
                <span className="pb-1 text-xs font-bold text-zinc-400">wRC+</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                リーグ平均100との差：
                <span className="font-bold text-zinc-700">
                  {fmtSignedPercent(batter.wrcPlus - 100)}
                </span>
              </p>
              <Link
                href={`/year/${batter.year}/${batter.rank}?from=compare`}
                onClick={() => {
                  window.sessionStorage.setItem(
                    `player-return:${batter.year}:${batter.rank}`,
                    "history"
                  );
                }}
                className="mt-4 inline-block text-xs font-bold text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950"
              >
                選手詳細を見る
              </Link>
            </article>
          );
        })}
      </div>

      {selected.length < 2 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-400">
          比較表を表示するには、あと{2 - selected.length}シーズン追加してください。
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-2 sm:grid-cols-4">
            {COMPARISON_HIGHLIGHTS.map((metric) => {
              const winner = selected.reduce((best, batter) =>
                metric.getValue(batter) > metric.getValue(best) ? batter : best
              );
              return (
                <div key={metric.label} className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
                  <p className="text-[11px] font-bold text-zinc-400">{metric.label} リード</p>
                  <p className="mt-1 truncate text-sm font-bold text-zinc-800">{winner.name}</p>
                  <p className="text-lg font-extrabold tabular-nums text-zinc-950">
                    {metric.format(metric.getValue(winner))}
                  </p>
                </div>
              );
            })}
          </section>
          <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-5">
            <div>
              <h2 className="font-bold tracking-tight text-zinc-900">主要指標比較</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                補正済みの評価、打撃内容、実際の成績を分けて見比べられます。
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
              色付き＝比較上有利な数値
            </span>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-3 text-left text-xs font-bold text-zinc-500">
                  指標
                </th>
                {selected.map((batter) => (
                  <th
                    key={seasonId(batter)}
                    className="px-4 py-3 text-center font-bold"
                  >
                    {batter.name}
                    <span className="ml-1 text-xs font-medium text-zinc-400">
                      {batter.year}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_GROUPS.flatMap((group) => [
                <tr key={group.label} className="border-y border-zinc-200 bg-zinc-100/70">
                  <th
                    colSpan={selected.length + 1}
                    className="px-4 py-2.5 text-left text-xs font-extrabold text-zinc-700"
                  >
                    {group.label}
                    <span className="ml-2 font-normal text-zinc-400">{group.description}</span>
                  </th>
                </tr>,
                ...group.metrics.map((metric) => {
                  const values = selected.map(metric.getValue);
                  const numericValues = values.filter(
                    (value): value is number => value !== null
                  );
                  const best =
                    metric.better === "none" || numericValues.length === 0
                      ? null
                      : metric.better === "lower"
                        ? Math.min(...numericValues)
                        : Math.max(...numericValues);
                  return (
                    <tr key={metric.label} className="border-t border-zinc-100">
                      <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-medium text-zinc-600">
                        {metric.label}
                        {metric.note && (
                          <span className="ml-1 text-[10px] font-normal text-zinc-400">
                            {metric.note}
                          </span>
                        )}
                      </th>
                      {values.map((value, index) => {
                        const isBest =
                          best !== null && value !== null && value === best;
                        return (
                          <td
                            key={seasonId(selected[index])}
                            className={`px-4 py-3 text-center text-base tabular-nums ${
                              isBest
                                ? "bg-amber-50 font-extrabold text-zinc-950"
                                : "font-semibold text-zinc-600"
                            }`}
                          >
                            {value === null ? "—" : metric.format(value)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
          </div>
          <p className="border-t border-zinc-100 px-4 py-3 text-[11px] leading-relaxed text-zinc-400 sm:px-5">
            実効PFは選手が実際に立った球場を打席数で加重した環境値です。値が高いほど打者有利ですが、選手の優劣を表すものではありません。wRC+はこの球場差とリーグ水準を補正して比較できます。
          </p>
          </section>
        </>
      )}
    </div>
  );
}
