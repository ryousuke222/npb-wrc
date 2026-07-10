import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAvailableYears, getPlayerHistory, getYearData } from "@/lib/data";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";
import CareerHistory from "@/app/components/CareerHistory";

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
  const history = await getPlayerHistory(batter.name);

  const highlightStats = [
    { label: "本塁打", value: batter.hr },
    { label: "打点", value: batter.rbi },
    { label: "安打", value: batter.hits },
    { label: "得点", value: batter.runs },
  ];

  const battingStats = [
    { label: "打席", value: batter.pa },
    { label: "打数", value: batter.ab },
    { label: "二塁打", value: batter.doubles },
    { label: "三塁打", value: batter.triples },
  ];

  const discStats = [
    { label: "四球", value: batter.bb },
    { label: "死球", value: batter.hbp },
    { label: "三振", value: batter.so },
    { label: "併殺打", value: batter.gdp },
    { label: "盗塁", value: batter.sb },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={`/year/${year}`}
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← {year}年のランキングに戻る
      </Link>

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

        {/* スラッシュライン */}
        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-xl bg-zinc-50 px-4 py-3">
          <div>
            <div className="text-xl font-bold tabular-nums">
              {fmtRate(batter.avg)}
            </div>
            <div className="text-[11px] text-zinc-400">打率</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">
              {fmtRate(batter.obp)}
            </div>
            <div className="text-[11px] text-zinc-400">出塁率</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">
              {fmtRate(batter.slg)}
            </div>
            <div className="text-[11px] text-zinc-400">長打率</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums text-zinc-500">
              {batter.ops.toFixed(3)}
            </div>
            <div className="text-[11px] text-zinc-400">OPS</div>
          </div>
        </div>

        {/* 主要成績（打率・本塁打・打点など、注目される数字を大きく） */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          {highlightStats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-100 py-3 text-center"
            >
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
        <div className="mt-8">
          <h2 className="text-xs font-bold tracking-wide text-zinc-400">
            打席内容
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {battingStats.map((s) => (
              <div key={s.label}>
                <div className="text-xs text-zinc-500">{s.label}</div>
                <div className="text-lg font-bold tabular-nums">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-100 pt-6">
          <h2 className="text-xs font-bold tracking-wide text-zinc-400">
            選球・走塁
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {discStats.map((s) => (
              <div key={s.label}>
                <div className="text-xs text-zinc-500">{s.label}</div>
                <div className="text-lg font-bold tabular-nums">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {batter.parkFactor !== null && (
          <p className="mt-6 border-t border-zinc-100 pt-4 text-xs text-zinc-400">
            {batter.teamName}の本拠地パークファクター(補正後):{" "}
            {batter.parkFactor.toFixed(3)}
            （1.0より大きいほど得点が入りやすい球場、小さいほど入りにくい球場であることを示します）
          </p>
        )}
      </div>

      <CareerHistory history={history} currentYear={year} />
    </div>
  );
}
