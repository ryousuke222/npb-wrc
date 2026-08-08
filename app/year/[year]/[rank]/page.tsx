import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAvailableYears, getPlayerHistory, getYearData } from "@/lib/data";
import { getSimilarSeasons } from "@/lib/playerInsights";
import { readableOnLight, teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus, wrcPlusTextColor } from "@/lib/wrc";
import CareerHistory from "@/app/components/CareerHistory";
import PlayerInsights from "@/app/components/PlayerInsights";
import PlayerBackLink from "@/app/components/PlayerBackLink";
import TeamBadge from "@/app/components/TeamBadge";

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
  const accent = readableOnLight(color.bg);
  const [history, similar] = await Promise.all([
    getPlayerHistory(batter.name, batter.nameKey, batter.year, batter.teamId),
    getSimilarSeasons(batter),
  ]);

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
  const wrcLeagueRank = batter.qualified
    ? qualifiedLeagueBatters.filter((b) => b.wrcPlus > batter.wrcPlus).length + 1
    : null;
  // 「上位◯%」は順位の割合で示す。従来の値はパーセンタイル（首位ほど100%）を
  // そのまま使っていたため、首位が「上位100%」と逆の意味で表示されていた。
  const wrcTopPercent =
    wrcLeagueRank !== null && qualifiedLeagueBatters.length > 0
      ? Math.max(1, Math.ceil((wrcLeagueRank / qualifiedLeagueBatters.length) * 100))
      : null;
  const teamRank = batter.qualified
    ? data.batters.filter((entry) => entry.teamId === batter.teamId && entry.qualified && entry.wrcPlus > batter.wrcPlus).length + 1
    : null;

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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
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
          borderLeftColor: color.bg,
          backgroundImage: `linear-gradient(135deg, ${withAlpha(color.bg, 0.14)}, transparent 46%)`,
        }}
        className="mt-4 overflow-hidden rounded-2xl border border-l-[8px] border-zinc-200 bg-white p-5 sm:p-7 lg:p-8"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-zinc-500">
              <span
                style={{ backgroundColor: withAlpha(color.bg, 0.13), color: accent }}
                className="rounded-full px-2.5 py-1"
              >
                {year}年
              </span>
              <span>{batter.league === "central" ? "セ・リーグ" : "パ・リーグ"}</span>
              <span className="text-zinc-300">/</span>
              <span>
                {batter.leagueRank !== null
                  ? `規定打席内 ${batter.leagueRank}位`
                  : "規定打席未到達・参考記録"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                {batter.name}
              </h1>
              {batter.age !== undefined && (
                <span className="rounded-full border border-zinc-200 bg-white/80 px-2.5 py-1 text-sm font-bold tabular-nums text-zinc-600">
                  {batter.age}歳
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TeamBadge teamId={batter.teamId} name={batter.teamName} size="sm" />
              {batter.bats && <span className="text-xs font-semibold text-zinc-500">{batter.bats}打</span>}
              {batter.position && <span className="text-xs font-semibold text-zinc-500">{batter.position}</span>}
              {!batter.qualified && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-500">
                  規定打席未到達
                </span>
              )}
            </div>

            {(batter.titles?.length ?? 0) > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {batter.titles?.map((title) => (
                  <span
                    key={title}
                    style={{
                      backgroundColor: withAlpha(color.bg, 0.15),
                      color: accent,
                      boxShadow: `inset 0 0 0 1px ${withAlpha(color.bg, 0.28)}`,
                    }}
                    className="rounded-full px-2.5 py-1 text-xs font-bold"
                  >
                    {title}
                  </span>
                ))}
              </div>
            )}

            <Link
              href={`/compare?players=${year}-${rank}`}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950"
            >
              このシーズンを比較 <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div
            style={{
              backgroundColor: withAlpha(color.bg, 0.1),
              boxShadow: `inset 0 0 0 1px ${withAlpha(color.bg, 0.22)}`,
            }}
            className="rounded-2xl px-5 py-5 lg:text-right"
          >
            <div className="flex items-end gap-2 lg:justify-end">
              <span className={`text-6xl font-black leading-none tabular-nums ${wrcPlusTextColor(batter.wrcPlus)}`}>
                {fmtWrcPlus(batter.wrcPlus)}
              </span>
              <span className="pb-1 text-sm font-bold text-zinc-500">wRC+</span>
            </div>
            {wrcTopPercent !== null && (
              <p className="mt-2 text-xs font-semibold text-zinc-500">
                リーグ規定到達者の上位{wrcTopPercent}%
              </p>
            )}
          </div>
        </div>

        {/* スラッシュライン＋OPS（リーグ平均位置を目盛り上の縦線で示すバー付き） */}
        <div className="mt-7 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-4 sm:px-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400">RATE STATS</p>
              <h2 className="mt-0.5 text-sm font-extrabold text-zinc-800">率成績とリーグ平均</h2>
            </div>
            <span className="text-[10px] font-medium text-zinc-400">縦線＝リーグ平均</span>
          </div>
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
                          color: accent,
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
        </div>

        {/* 主要成績（本塁打・打点など、注目される数字を大きく） */}
        <section
          style={{
            borderLeftColor: color.bg,
            backgroundImage: `linear-gradient(135deg, ${withAlpha(color.bg, 0.09)}, white 55%)`,
          }}
          className="mt-6 rounded-2xl border border-l-[5px] border-zinc-200 p-4 sm:p-5"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400">打撃の結果</p>
              <h2 className="mt-0.5 text-sm font-extrabold text-zinc-800">主要成績</h2>
            </div>
            <span className="text-[10px] font-medium text-zinc-400">順位はリーグ内</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {primaryStats.map((s) => (
              <div
                key={s.label}
                style={{
                  backgroundColor: withAlpha(color.bg, 0.06),
                  boxShadow: `inset 0 3px 0 ${withAlpha(color.bg, 0.72)}`,
                }}
                className="relative rounded-xl border border-zinc-200/80 px-3 py-4 text-center shadow-sm"
              >
                {s.rank !== null && (
                  <span
                    style={{
                      backgroundColor: withAlpha(color.bg, 0.16),
                      color: accent,
                    }}
                    className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-extrabold"
                  >
                    {s.rank}位
                  </span>
                )}
                <div className="text-3xl font-black tabular-nums text-zinc-950">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] font-bold text-zinc-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 詳細成績 */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div
            style={{ backgroundColor: withAlpha(color.bg, 0.08) }}
            className="flex items-end justify-between gap-3 border-b border-zinc-200 px-4 py-3.5 sm:px-5"
          >
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400">成績内訳</p>
              <h2 className="mt-0.5 text-sm font-extrabold text-zinc-800">詳細成績</h2>
            </div>
            <span
              style={{ backgroundColor: withAlpha(color.bg, 0.14), color: accent }}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            >
              {batter.pa}打席
            </span>
          </div>

          <div className="space-y-5 p-4 sm:p-5">
            <div>
              <h3 className="text-[11px] font-extrabold text-zinc-500">基本成績</h3>
              <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                {secondaryStats.map((s) => (
                  <div
                    key={s.label}
                    style={{ boxShadow: `inset 0 2px 0 ${withAlpha(color.bg, 0.45)}` }}
                    className="relative rounded-lg border border-zinc-200 bg-zinc-50/70 px-1.5 py-3 text-center"
                  >
                    {s.rank !== null && (
                      <span
                        style={{ backgroundColor: withAlpha(color.bg, 0.16), color: accent }}
                        className="absolute top-1 right-1 rounded px-1.5 py-0.5 text-[8px] font-extrabold"
                      >
                        {s.rank}位
                      </span>
                    )}
                    <div className="text-lg font-black tabular-nums text-zinc-800">{s.value}</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-zinc-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <h3 className="text-[11px] font-extrabold text-zinc-500">選球・打撃指標</h3>
              <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {advancedStats.map((s) => (
                  <div
                    key={s.label}
                    style={{
                      backgroundColor: withAlpha(color.bg, 0.06),
                      boxShadow: `inset 0 2px 0 ${withAlpha(color.bg, 0.45)}`,
                    }}
                    className="relative rounded-lg border border-zinc-200 px-2 py-3 text-center"
                  >
                    <div className="text-lg font-black tabular-nums text-zinc-800">{s.value}</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-zinc-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>

      <PlayerInsights batter={batter} history={history} similar={similar} teamRank={teamRank} leagueRank={wrcLeagueRank} />
      <CareerHistory history={history} currentYear={year} />
    </div>
  );
}
