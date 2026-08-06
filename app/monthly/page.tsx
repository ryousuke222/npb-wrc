import Link from "next/link";
import PageIntro from "@/app/components/PageIntro";
import { getMonthlyRanking, type MonthlyBatter } from "@/lib/monthly";
import { teamColor, withAlpha } from "@/lib/teamColors";

function fmtRate(value: number) { return value.toFixed(3).replace(/^0\./, "."); }

function Rows({ rows }: { rows: MonthlyBatter[] }) {
  return <ol className="space-y-2">{rows.map((row, index) => {
    const color = teamColor(row.batter.teamId);
    return <li key={`${row.batter.teamId}-${row.batter.rank}`}><Link href={`/year/${row.batter.year}/${row.batter.rank}`} style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.07) }} className="flex items-center gap-3 rounded-xl border border-l-[5px] border-zinc-200/80 px-3 py-2.5 transition-transform hover:-translate-y-0.5 hover:shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-extrabold tabular-nums text-zinc-600 sm:h-10 sm:w-10">{index + 1}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-base font-bold tracking-tight text-zinc-900 sm:text-lg">{row.batter.name}</span><span className="mt-0.5 flex flex-wrap items-center gap-1.5"><span style={{ backgroundColor: "#fff", color: "#3f3f46", boxShadow: `inset 3px 0 0 ${color.bg}` }} className="rounded-full px-2 py-0.5 text-[10px] font-bold">{row.batter.teamName}</span><span className="text-[10px] font-medium text-zinc-600 sm:text-[11px]">{row.hr}本・{row.rbi}打点・{row.pa}/{row.requiredPa}打席</span></span></span>
      <span className="shrink-0 text-right"><span className="block text-xl font-extrabold tabular-nums text-zinc-950 sm:text-2xl">{fmtRate(row.ops)}</span><span className="block text-[10px] font-medium text-zinc-600">OPS</span></span>
    </Link></li>;
  })}</ol>;
}

function LeagueSection({ title, month, rows, qualifiedCount }: { title: string; month: number; rows: MonthlyBatter[]; qualifiedCount: number }) {
  return <section className="rounded-xl border border-zinc-200 bg-white p-4"><div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-base font-bold tracking-tight text-zinc-900">{title}</h2><span className="text-[11px] text-zinc-600">{month}月・規定到達 {qualifiedCount}名</span></div><Rows rows={rows} /></section>;
}

export const metadata = { title: "月間ランキング | NPB最強打者ランキング", description: "月ごとの途中経過をOPSで見るNPB打者ランキング。" };

export default async function MonthlyPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const monthly = await getMonthlyRanking(month);
  return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
    <PageIntro title={monthly ? `${monthly.period.label} 月間ランキング` : "月間ランキング"} description="各球団の月間試合数 × 3.1打席を満たした打者を、OPSでランキング。" meta={monthly?.label ? `集計期間：${monthly.label}・球団ごとの月間規定打席以上` : "今月の試合後データを待っています"} />
    {monthly && <nav className="mb-5 flex flex-wrap gap-2" aria-label="月を選ぶ">{monthly.availablePeriods.map((period) => <Link key={period.key} href={`/monthly?month=${period.key}`} aria-current={period.key === monthly.period.key ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${period.key === monthly.period.key ? "border-amber-300 bg-amber-100 text-amber-900" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"}`}>{period.label}</Link>)}</nav>}
    {monthly?.label && <section className="mb-5 grid gap-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-3 sm:grid-cols-3 sm:p-4" aria-label="集計条件"><div className="rounded-xl bg-white/80 px-3 py-2.5"><span className="block text-[10px] font-bold text-sky-700">集計期間</span><span className="mt-1 block text-sm font-extrabold text-zinc-800">{monthly.label}</span></div><div className="rounded-xl bg-white/80 px-3 py-2.5"><span className="block text-[10px] font-bold text-sky-700">差分の基準</span><span className="mt-1 block text-sm font-extrabold text-zinc-800">{monthly.coverageNote}</span></div><div className="rounded-xl bg-white/80 px-3 py-2.5"><span className="block text-[10px] font-bold text-sky-700">表示条件</span><span className="mt-1 block text-sm font-extrabold text-zinc-800">球団試合数 × 3.1打席</span></div></section>}
    {monthly && (monthly.central.length > 0 || monthly.pacific.length > 0) ? <div className="grid gap-4 lg:grid-cols-2"><LeagueSection title="セ・リーグ 月間OPS TOP10" month={monthly.period.month} rows={monthly.central} qualifiedCount={monthly.qualifiedCounts.central} /><LeagueSection title="パ・リーグ 月間OPS TOP10" month={monthly.period.month} rows={monthly.pacific} qualifiedCount={monthly.qualifiedCounts.pacific} /></div> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-zinc-600"><p className="font-bold text-zinc-800">{monthly?.period.label ?? "今月"}は、まだ月間規定打席に到達した打者がいません。</p><p className="mt-1">試合後のデータがたまると、この月のランキングを表示します。過去月は上のボタンから確認できます。</p></div>}
  </div>;
}
