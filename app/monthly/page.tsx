import Link from "next/link";
import PageIntro from "@/app/components/PageIntro";
import { getCurrentMonthRanking, type MonthlyBatter } from "@/lib/monthly";
import { teamColor, withAlpha } from "@/lib/teamColors";

function fmtRate(value: number) { return value.toFixed(3).replace(/^0\./, "."); }

function Rows({ rows }: { rows: MonthlyBatter[] }) {
  return <ol className="space-y-1.5">{rows.map((row, index) => {
    const color = teamColor(row.batter.teamId);
    return <li key={`${row.batter.teamId}-${row.batter.rank}`}><Link href={`/year/${row.batter.year}/${row.batter.rank}`} style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.07) }} className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200/80 px-2.5 py-2 hover:shadow-sm">
      <span className="w-5 text-center text-xs font-bold tabular-nums text-zinc-400">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">{row.batter.name}</span><span className="hidden text-[11px] text-zinc-400 sm:inline">{row.hr}本・{row.rbi}打点</span><span className="text-base font-extrabold tabular-nums text-zinc-950">{fmtRate(row.ops)}</span>
    </Link></li>;
  })}</ol>;
}

export const metadata = { title: "月間ランキング | NPB最強打者ランキング", description: "最新月の途中経過をOPSで見るNPB打者ランキング。" };

export default async function MonthlyPage() {
  const monthly = await getCurrentMonthRanking();
  return <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-3xl"><PageIntro title={monthly ? `${monthly.year}年${monthly.month}月 月間ランキング` : "月間ランキング"} description="今月の打撃成績をOPSでランキング。月初からのデータがたまるほど、月間成績として精度が上がります。" meta={monthly ? `集計期間：${monthly.label}・${monthly.minPa}打席以上` : "月間比較データを蓄積中"} />
    {monthly ? <div className="grid gap-4 sm:grid-cols-2"><section className="rounded-xl border border-zinc-200 bg-white p-4"><div className="mb-3 flex items-baseline justify-between"><h2 className="text-base font-bold">セ・リーグ OPS</h2><span className="text-[11px] text-zinc-400">{monthly.month}月</span></div><Rows rows={monthly.central} /></section><section className="rounded-xl border border-zinc-200 bg-white p-4"><div className="mb-3 flex items-baseline justify-between"><h2 className="text-base font-bold">パ・リーグ OPS</h2><span className="text-[11px] text-zinc-400">{monthly.month}月</span></div><Rows rows={monthly.pacific} /></section></div> : <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-500">月の最初と最新のデータがそろうと、月間ランキングを表示します。</div>}
  </div>;
}
