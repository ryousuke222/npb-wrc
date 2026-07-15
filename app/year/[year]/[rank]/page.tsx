import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAvailableYears, getPlayerHistory, getYearData } from "@/lib/data";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";
import CareerHistory from "@/app/components/CareerHistory";
import PlayerBackLink from "@/app/components/PlayerBackLink";

// 規定打席到達者のみビルド時に静的生成する（大半のアクセスがここに集中するため）。
// それ以外（打席数フィルターを下げたときだけ現れる選手）はアクセス時にオンデマンドで生成する。
export async function generateStaticParams() {
  const years = await getAvailableYears();
  const params: { year: string; rank: string }[] = [];
  for (const year of years) {
    const data = await getYearData(year);
    if (!data) continue;
    for (const b of data.batters) {
      if (!b.qualified) continue;
      params.push({ year: String(year), rank: String(b.rank) });
    }
  }
  return params;
}

function fmtRate(n: number): string {
  return n.toFixed(3).replace(/^0\./, ".");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; rank: string }>;
}): Promise<Metadata> {
  const { year: yearParam, rank: rankParam } = await params;
  const year = Number(yearParam);
  const rank = Number(rankParam);
  const data = await getYearData(year);
  const batter = data?.batters.find((b) => b.rank === rank);
  if (!batter) return { title: "選手が見つかりません | NPB最強打者ランキング" };

  return {
    title: `${batter.name}（${batter.teamName}）${year}年成績 wRC+ ${fmtWrcPlus(batter.wrcPlus)} | NPB最強打者ランキング`,
    description: `${year}年 ${batter.name}（${batter.teamName}）の成績。wRC+ ${fmtWrcPlus(batter.wrcPlus)}、打率${fmtRate(batter.avg)}、本塁打${batter.hr}本。年度別成績の推移も確認できます。`,
  };
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ year: string; rank: string }>;
}) {
  const { year: yearParam, rank: rankParam } = await params;
  const year = Number(yearParam);
  const rank = Number(rankParam);
  if (!Number.isInteger(year) || !Number.isInteger(rank)) notFound();

  const data = await getYearData(year);
  if (!data) notFound();

  const batter = data.batters.find((b) => b.rank === rank);
  if (!batter) notFound();

  const color = teamColor(batter.teamId);
  const history = await getPlayerHistory(batter.name, batter.nameKey);

  const lgTotals = data.leagueContext[batter.league].totals;
  const lgAvg = lgTotals.ab > 0 ? lgTotals.hits / lgTotals.ab : 0;
  const lgObpDenom = lgTotals.ab + lgTotals.bb + lgTotals.hbp + lgTotals.sf;
  const lgObp =
    lgObpDenom > 0 ? (lgTotals.hits + lgTotals.bb + lgTotals.hbp) / lgObpDenom : 0;
  const lgSlg = lgTotals.ab > 0 ? lgTotals.totalBases / lgTotals.ab : 0;

  // その年・そのリーグでの順位（10位以内のときだけバッジ表示に使う）。打率等の
  // 率成績はNPBの規定打席ルールに合わせ規定到達者内で、本塁打等の積み上げ成績は
  // 規定打席に関わらず全打者内で順位を出す（実際のタイトル戦の扱いに合わせている）。
  const leagueBatters = data.batters.filter((b) => b.league === batter.league);
  const qualifiedLeagueBatters = leagueBatters.filter((b) => b.qualified);

  function rankAmong(
    pool: typeof leagueBatters,
    value: number,
    getValue: (b: (typeof leagueBatters)[number]) => number
  ): number | null {
    const rank = pool.filter((b) => getValue(b) > value).length + 1;
    return rank <= 10 ? rank : null;
  }

  // 打率・出塁率・長打率・OPSのバー表示用の目盛り上限（歴代の突出したシーズンにも
  // 十分な余白を持たせつつ、通常のシーズンでもバーの伸び幅の差が見える値）
  const rateStats = [
    { label: "打率", value: batter.avg, lgValue: lgAvg, max: 0.4, getValue: (b: typeof batter) => b.avg },
    { label: "出塁率", value: batter.obp, lgValue: lgObp, max: 0.5, getValue: (b: typeof batter) => b.obp },
    { label: "長打率", value: batter.slg, lgValue: lgSlg, max: 0.75, getValue: (b: typeof batter) => b.slg },
    {
      label: "OPS",
      value: batter.ops,
      lgValue: lgObp + lgSlg,
      max: 1.2,
      getValue: (b: typeof batter) => b.ops,
    },
  ].map((s) => ({
    ...s,
    rank: batter.qualified ? rankAmong(qualifiedLeagueBatters, s.value, s.getValue) : null,
  }));

  const primaryStats = [
    { label: "本塁打", value: batter.hr, getValue: (b: typeof batter) => b.hr },
    { label: "打点", value: batter.rbi, getValue: (b: typeof batter) => b.rbi },
    { label: "安打", value: batter.hits, getValue: (b: typeof batter) => b.hits },
    { label: "得点", value: batter.runs, getValue: (b: typeof batter) => b.runs },
  ].map((s) => ({ ...s, rank: rankAmong(leagueBatters, s.value, s.getValue) }));

  const secondaryStats = [
    { label: "打席", value: batter.pa, getValue: (b: typeof batter) => b.pa },
    { label: "打数", value: batter.ab, getValue: (b: typeof batter) => b.ab },
    { label: "二塁打", value: batter.doubles, getValue: (b: typeof batter) => b.doubles },
    { label: "三塁打", value: batter.triples, getValue: (b: typeof batter) => b.triples },
    { label: "四球", value: batter.bb, getValue: (b: typeof batter) => b.bb },
    { label: "死球", value: batter.hbp, getValue: (b: typeof batter) => b.hbp },
    { label: "三振", value: batter.so, getValue: (b: typeof batter) => b.so },
    { label: "併殺打", value: batter.gdp, getValue: (b: typeof batter) => b.gdp },
    { label: "盗塁", value: batter.sb, getValue: (b: typeof batter) => b.sb },
  ].map((s) => ({ ...s, rank: rankAmong(leagueBatters, s.value, s.getValue) }));

  const advancedStats = [
    { label: "ISO", value: fmtRate(batter.slg - batter.avg), rank: null },
    {
      label: "BB%",
      value: batter.pa > 0 ? `${((batter.bb / batter.pa) * 100).toFixed(1)}%` : "—",
      rank: null,
    },
    {
      label: "K%",
      value: batter.pa > 0 ? `${((batter.so / batter.pa) * 100).toFixed(1)}%` : "—",
      rank: null,
    },
    {
      label: "BB/K",
      value: batter.so > 0 ? (batter.bb / batter.so).toFixed(2) : "—",
      rank: null,
    },
    { label: "wOBA", value: fmtRate(batter.woba), rank: null },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Suspense
        fallback={
          <span className="text-sm text-zinc-500">
            ← {year}年のランキングに戻る
          </span>
        }
      >
        <PlayerBackLink year={year} rank={rank} />
      </Suspense>

      <div
        style={{
          borderTopColor: color.bg,
          backgroundImage: `linear-gradient(180deg, ${withAlpha(color.bg, 0.1)}, transparent 140px)`,
        }}
        className="mt-4 rounded-2xl border border-t-[6px] border-zinc-200 bg-white p-6 sm:p-8"
      >
        <p className="text-sm font-medium text-zinc-500">
          {year}年 {batter.league === "central" ? "セ・リーグ" : "パ・リーグ"}{" "}
          {batter.leagueRank !== null
            ? `規定打席内 ${batter.leagueRank}位`
            : "規定打席未到達（参考記録）"}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {batter.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            style={{
              backgroundColor: withAlpha(color.bg, 0.16),
              color: color.bg,
            }}
            className="inline-block rounded-full px-2.5 py-1 text-sm font-bold"
          >
            {batter.teamName}
          </span>
          {!batter.qualified && (
            <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-1 text-sm font-bold text-zinc-500">
              規定打席未到達
            </span>
          )}
          <Link
            href={`/compare?players=${year}-${rank}`}
            className="inline-block rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-sm font-bold text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
          >
            このシーズンを比較
          </Link>
        </div>

        {/* wRC+ ヒーロー表示 */}
        <div className="mt-6 flex items-end gap-2">
          <span className="text-5xl font-extrabold tabular-nums text-red-600 sm:text-6xl">
            {fmtWrcPlus(batter.wrcPlus)}
          </span>
          <span className="pb-1.5 text-sm font-semibold text-zinc-400">
            wRC+
          </span>
        </div>

        {/* スラッシュライン＋OPS（リーグ平均位置を目盛り上の縦線で示すバー付き） */}
        <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {rateStats.map((s) => {
              const displayValue =
                s.label === "OPS" ? s.value.toFixed(3) : fmtRate(s.value);
              const displayLgValue =
                s.label === "OPS" ? s.lgValue.toFixed(3) : fmtRate(s.lgValue);
              return (
                <div key={s.label}>
                  <div className="text-lg font-bold tabular-nums sm:text-xl">
                    {displayValue}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-zinc-400">{s.label}</span>
                    {s.rank !== null && (
                      <span
                        style={{
                          backgroundColor: withAlpha(color.bg, 0.16),
                          color: color.bg,
                        }}
                        className="rounded px-1 py-0.5 text-[10px] font-bold"
                      >
                        リーグ{s.rank}位
                      </span>
                    )}
                  </div>
                  <div className="relative mt-2 h-1.5 rounded-full bg-zinc-200">
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, (s.value / s.max) * 100))}%`,
                        backgroundColor: color.bg,
                      }}
                      className="h-full rounded-full"
                    />
                    <div
                      title={`リーグ平均 ${displayLgValue}`}
                      style={{
                        left: `${Math.max(0, Math.min(100, (s.lgValue / s.max) * 100))}%`,
                      }}
                      className="absolute top-0 h-full w-px bg-zinc-500/60"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3.5 border-t border-zinc-200 pt-2.5 text-[11px] text-zinc-400">
            縦線はリーグ平均
          </p>
        </div>

        {/* 主要成績（本塁打・打点など、注目される数字を大きく） */}
        <div className="mt-6 grid grid-cols-4 gap-2.5">
          {primaryStats.map((s) => (
            <div
              key={s.label}
              className="relative rounded-xl bg-zinc-50 py-3.5 text-center"
            >
              {s.rank !== null && (
                <span
                  style={{ backgroundColor: color.bg, color: color.on }}
                  className="absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                >
                  {s.rank}位
                </span>
              )}
              <div className="text-2xl font-extrabold tabular-nums">
                {s.value}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-400">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* 詳細成績 */}
        <div className="mt-6">
          <h2 className="text-xs font-bold tracking-wide text-zinc-400">
            詳細成績
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {[...secondaryStats, ...advancedStats].map((s) => (
              <div
                key={s.label}
                className="relative rounded-lg bg-zinc-50 py-2.5 text-center"
              >
                {s.rank !== null && (
                  <span
                    style={{ backgroundColor: color.bg, color: color.on }}
                    className="absolute top-1 right-1 rounded-full px-1 py-0.5 text-[8px] font-bold"
                  >
                    {s.rank}位
                  </span>
                )}
                <div className="text-base font-bold tabular-nums text-zinc-700">
                  {s.value}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-400">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <CareerHistory history={history} currentYear={year} />
    </div>
  );
}
