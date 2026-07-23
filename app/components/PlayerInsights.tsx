import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

function fmtRate(value: number) { return value.toFixed(3).replace(/^0\./, "."); }
function href(batter: BatterRanking) { return `/year/${batter.year}/${batter.rank}`; }

export default function PlayerInsights({ batter, history, similar, teamRank, leagueRank }: { batter: BatterRanking; history: BatterRanking[]; similar: BatterRanking[]; teamRank: number | null; leagueRank: number | null }) {
  const qualified = history.filter((entry) => entry.qualified);
  const bestWrc = qualified.reduce((best, entry) => !best || entry.wrcPlus > best.wrcPlus ? entry : best, null as BatterRanking | null);
  const bestOps = qualified.reduce((best, entry) => !best || entry.ops > best.ops ? entry : best, null as BatterRanking | null);
  const maxHr = history.reduce((best, entry) => !best || entry.hr > best.hr ? entry : best, null as BatterRanking | null);
  const maxRbi = history.reduce((best, entry) => !best || entry.rbi > best.rbi ? entry : best, null as BatterRanking | null);
  const total = history.reduce((sum, entry) => ({ pa: sum.pa + entry.pa, hr: sum.hr + entry.hr, rbi: sum.rbi + entry.rbi, weightedWrc: sum.weightedWrc + entry.wrcPlus * entry.pa }), { pa: 0, hr: 0, rbi: 0, weightedWrc: 0 });
  const firstYear = Math.min(...history.map((entry) => entry.year));
  const lastYear = Math.max(...history.map((entry) => entry.year));
  const careerYears = new Set(history.map((entry) => entry.year)).size;
  const qualifiedYears = new Set(qualified.map((entry) => entry.year)).size;
  const titleEvents = history.flatMap((entry) => (entry.titles ?? []).map((title) => ({ entry, title }))).filter(({ title }) => title !== "—");
  const color = teamColor(batter.teamId);
  const highlights = [
    { label: "最高wRC+", season: bestWrc, value: bestWrc ? fmtWrcPlus(bestWrc.wrcPlus) : "—" },
    { label: "最高OPS", season: bestOps, value: bestOps ? fmtRate(bestOps.ops) : "—" },
    { label: "最多本塁打", season: maxHr, value: maxHr ? `${maxHr.hr}本` : "—" },
    { label: "最多打点", season: maxRbi, value: maxRbi ? `${maxRbi.rbi}打点` : "—" },
  ];
  return <div className="mt-6 space-y-6">
    <section
      style={{
        borderTopColor: color.bg,
        backgroundImage: `linear-gradient(135deg, ${withAlpha(color.bg, 0.13)}, transparent 52%)`,
      }}
      className="overflow-hidden rounded-2xl border border-t-[5px] border-zinc-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-400">SEASON POSITION</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight">この年の立ち位置</h2>
        </div>
        <span
          style={{ backgroundColor: withAlpha(color.bg, 0.14), color: color.bg }}
          className="rounded-full px-3 py-1 text-xs font-bold"
        >
          {batter.age ? `${batter.age}歳シーズン` : `${batter.year}年`}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div
          style={{ backgroundColor: withAlpha(color.bg, 0.12), color: color.bg }}
          className="col-span-2 rounded-2xl border border-white p-4 sm:col-span-1"
        >
          <div className="text-[10px] font-bold tracking-wide opacity-70">リーグ wRC+</div>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-4xl font-black tabular-nums">{leagueRank ? leagueRank : "—"}</span>
            <span className="pb-1 text-xs font-bold opacity-70">{leagueRank ? "位" : "参考"}</span>
          </div>
        </div>
        {[
          { label: "チーム内 wRC+", value: teamRank ? `${teamRank}位` : "参考" },
          { label: "リーグ平均との差", value: `${batter.wrcPlus >= 100 ? "+" : ""}${Math.round(batter.wrcPlus - 100)}` },
          { label: "主なポジション", value: batter.position ?? "—" },
        ].map((item) => (
          <div key={item.label} className="flex min-h-24 flex-col justify-between rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="text-[10px] font-bold tracking-wide text-zinc-400">{item.label}</div>
            <div className="mt-3 text-xl font-black tabular-nums text-zinc-900">{item.value}</div>
          </div>
        ))}
      </div>
    </section>

    <section
      style={{
        borderTopColor: color.bg,
        backgroundImage: `linear-gradient(135deg, ${withAlpha(color.bg, 0.11)}, white 48%)`,
      }}
      className="overflow-hidden rounded-2xl border border-t-[5px] border-zinc-200 bg-white shadow-sm"
    >
      <div className="grid sm:grid-cols-[1.05fr_1.45fr]">
        <div className="border-b border-zinc-200 p-5 sm:border-r sm:border-b-0 sm:p-6">
          <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-400">CAREER SUMMARY</p>
          <h2 className="mt-1 text-lg font-extrabold text-zinc-950">キャリア要約</h2>
          <p className="mt-1 text-xs text-zinc-500">{firstYear}–{lastYear}・{careerYears}シーズン</p>
          <div className="mt-6">
            <div className="text-[11px] font-bold text-zinc-500">通算 wRC+</div>
            <div style={{ color: color.bg }} className="mt-1 text-5xl font-black tabular-nums tracking-tight">
              {total.pa ? fmtWrcPlus(total.weightedWrc / total.pa) : "—"}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">年度別wRC+を打席数で加重平均</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-zinc-200">
          {[
            { label: "通算打席", value: total.pa.toLocaleString("ja-JP"), unit: "PA" },
            { label: "通算本塁打", value: total.hr.toLocaleString("ja-JP"), unit: "HR" },
            { label: "通算打点", value: total.rbi.toLocaleString("ja-JP"), unit: "RBI" },
            { label: "規定打席到達", value: qualifiedYears, unit: "SEASONS" },
          ].map((item) => (
            <div key={item.label} className="bg-white p-5 sm:p-6">
              <div className="text-[10px] font-bold tracking-wide text-zinc-400">{item.label}</div>
              <div className="mt-3 text-3xl font-black tabular-nums tracking-tight text-zinc-950">{item.value}</div>
              <div className="mt-1 text-[9px] font-bold tracking-[0.16em] text-zinc-400">{item.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-amber-600">BEST SEASONS</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight">キャリアハイ</h2>
        </div>
        <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[10px] font-bold text-amber-700">自己最高記録</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {highlights.map(({ label, season, value }) => {
          const seasonColor = season ? teamColor(season.teamId) : color;
          return (
            <Link
              key={label}
              href={season ? href(season) : "#"}
              style={{
                borderTopColor: seasonColor.bg,
                backgroundImage: `linear-gradient(145deg, ${withAlpha(seasonColor.bg, 0.1)}, white 58%)`,
              }}
              className="group relative overflow-hidden rounded-2xl border border-t-4 border-zinc-200 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-[10px] font-bold tracking-wide text-zinc-400">{label}</div>
              <div className="mt-3 text-3xl font-black tabular-nums tracking-tight text-zinc-950">{value}</div>
              {season && (
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-200/70 pt-3">
                  <span className="text-xs font-extrabold text-zinc-700">{season.year}年</span>
                  <span className="text-[10px] font-semibold text-zinc-400">{season.age ? `${season.age}歳` : season.teamName}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>

    {(titleEvents.length > 0 || similar.length > 0) && <section className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-base font-bold">タイトル・ベストナイン</h2>{titleEvents.length ? <ol className="mt-3 space-y-1.5">{titleEvents.map(({ entry, title }) => <li key={`${entry.year}-${title}`}><Link href={href(entry)} style={{ borderLeftColor: teamColor(entry.teamId).bg, backgroundColor: withAlpha(teamColor(entry.teamId).bg, .06) }} className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200 px-2.5 py-2"><span className="w-10 text-xs font-bold text-zinc-500">{entry.year}</span><span className="text-sm font-semibold text-zinc-800">{title}</span></Link></li>)}</ol> : <p className="mt-3 text-sm text-zinc-500">記録なし</p>}</div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-base font-bold">似たシーズン</h2><p className="mt-1 text-[11px] text-zinc-400">wRC+・OPS・本塁打・打席数から近い年度を抽出</p><ol className="mt-3 space-y-1.5">{similar.map((entry) => <li key={`${entry.year}-${entry.rank}`}><Link href={href(entry)} style={{ borderLeftColor: teamColor(entry.teamId).bg }} className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200 px-2.5 py-2 hover:bg-zinc-50"><span className="text-xs font-bold text-zinc-500">{entry.year}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.name}</span><span className="text-sm font-extrabold">{fmtWrcPlus(entry.wrcPlus)}</span></Link></li>)}</ol></div>
    </section>}
  </div>;
}
