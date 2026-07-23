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
  const titleEvents = history.flatMap((entry) => (entry.titles ?? []).map((title) => ({ entry, title }))).filter(({ title }) => title !== "—");
  const color = teamColor(batter.teamId);
  const highlights = [
    { label: "最高wRC+", season: bestWrc, value: bestWrc ? fmtWrcPlus(bestWrc.wrcPlus) : "—" },
    { label: "最高OPS", season: bestOps, value: bestOps ? fmtRate(bestOps.ops) : "—" },
    { label: "最多本塁打", season: maxHr, value: maxHr ? `${maxHr.hr}本` : "—" },
    { label: "最多打点", season: maxRbi, value: maxRbi ? `${maxRbi.rbi}打点` : "—" },
  ];
  return <div className="mt-6 space-y-6">
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-bold">この年の立ち位置</h2><span className="text-xs text-zinc-400">{batter.age ? `${batter.age}歳シーズン` : "年齢データなし"}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[{ label: "リーグwRC+", value: leagueRank ? `${leagueRank}位` : "参考" }, { label: "チーム内wRC+", value: teamRank ? `${teamRank}位` : "参考" }, { label: "リーグ平均との差", value: `${batter.wrcPlus >= 100 ? "+" : ""}${Math.round(batter.wrcPlus - 100)}` }, { label: "ポジション", value: batter.position ?? "—" }].map((item) => <div key={item.label} className="rounded-xl bg-zinc-50 p-3"><div className="text-lg font-extrabold tabular-nums">{item.value}</div><div className="mt-0.5 text-[11px] text-zinc-400">{item.label}</div></div>)}
      </div>
    </section>

    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"><h2 className="text-base font-bold">キャリア要約</h2><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[{ label: "通算打席", value: total.pa }, { label: "通算wRC+", value: total.pa ? fmtWrcPlus(total.weightedWrc / total.pa) : "—" }, { label: "通算本塁打", value: total.hr }, { label: "規定到達", value: `${new Set(qualified.map((entry) => entry.year)).size}年` }].map((item) => <div key={item.label} className="rounded-xl bg-zinc-50 p-3 text-center"><div className="text-xl font-extrabold tabular-nums">{item.value}</div><div className="mt-0.5 text-[11px] text-zinc-400">{item.label}</div></div>)}</div></section>

    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"><h2 className="text-base font-bold">キャリアハイ</h2><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{highlights.map(({ label, season, value }) => <Link key={label} href={season ? href(season) : "#"} className="rounded-xl bg-zinc-50 p-3 hover:bg-zinc-100"><div className="text-xl font-extrabold tabular-nums">{value}</div><div className="mt-0.5 text-[11px] text-zinc-400">{label}</div>{season && <div className="mt-2 text-[11px] font-semibold text-zinc-600">{season.year}年 {season.age ? `${season.age}歳` : ""}</div>}</Link>)}</div></section>

    {(titleEvents.length > 0 || similar.length > 0) && <section className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-base font-bold">タイトル・ベストナイン</h2>{titleEvents.length ? <ol className="mt-3 space-y-1.5">{titleEvents.map(({ entry, title }) => <li key={`${entry.year}-${title}`}><Link href={href(entry)} style={{ borderLeftColor: teamColor(entry.teamId).bg, backgroundColor: withAlpha(teamColor(entry.teamId).bg, .06) }} className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200 px-2.5 py-2"><span className="w-10 text-xs font-bold text-zinc-500">{entry.year}</span><span className="text-sm font-semibold text-zinc-800">{title}</span></Link></li>)}</ol> : <p className="mt-3 text-sm text-zinc-500">記録なし</p>}</div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-base font-bold">似たシーズン</h2><p className="mt-1 text-[11px] text-zinc-400">wRC+・OPS・本塁打・打席数から近い年度を抽出</p><ol className="mt-3 space-y-1.5">{similar.map((entry) => <li key={`${entry.year}-${entry.rank}`}><Link href={href(entry)} style={{ borderLeftColor: teamColor(entry.teamId).bg }} className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200 px-2.5 py-2 hover:bg-zinc-50"><span className="text-xs font-bold text-zinc-500">{entry.year}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.name}</span><span className="text-sm font-extrabold">{fmtWrcPlus(entry.wrcPlus)}</span></Link></li>)}</ol></div>
    </section>}
  </div>;
}
