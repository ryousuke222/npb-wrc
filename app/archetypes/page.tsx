import Link from "next/link";
import { notFound } from "next/navigation";
import PageIntro from "@/app/components/PageIntro";
import { getLatestArchetypes, type BatterArchetype } from "@/lib/archetypes";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

const TYPES: { type: BatterArchetype; description: string }[] = [
  { type: "万能型", description: "出塁と長打を高水準で両立" },
  { type: "長打型", description: "ISOがリーグ上位" },
  { type: "出塁型", description: "出塁率がリーグ上位" },
  { type: "コンタクト型", description: "打率と三振の少なさが武器" },
  { type: "バランス型", description: "総合力で打線を支える" },
];

export const metadata = { title: "打者タイプ診断 | NPB最強打者ランキング", description: "出塁・長打・コンタクト傾向から見る最新NPB打者のタイプ分類。" };

export default async function ArchetypesPage() {
  const data = await getLatestArchetypes();
  if (!data) notFound();
  return <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-3xl"><PageIntro title={`${data.year}年 打者タイプ診断`} description="規定打席到達者を、出塁・長打・コンタクト傾向で分類します。" meta="各リーグ内の相対評価・シーズン途中の暫定分類" />
    <div className="grid gap-4 sm:grid-cols-2">{TYPES.map(({ type, description }) => {
      const players = data.entries.filter((entry) => entry.type === type).sort((a, b) => b.batter.wrcPlus - a.batter.wrcPlus).slice(0, 6);
      return <section key={type} className="rounded-xl border border-zinc-200 bg-white p-4"><div className="flex items-baseline justify-between gap-3"><h2 className="text-base font-bold">{type}</h2><span className="text-[11px] text-zinc-400">{description}</span></div>{players.length ? <ol className="mt-3 space-y-1.5">{players.map(({ batter, iso }, index) => { const color = teamColor(batter.teamId); return <li key={batter.rank}><Link href={`/year/${batter.year}/${batter.rank}`} style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.06) }} className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200 px-2.5 py-2 hover:shadow-sm"><span className="w-4 text-center text-[10px] font-bold text-zinc-400">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">{batter.name}</span><span className="hidden text-[10px] text-zinc-400 sm:inline">ISO {(iso).toFixed(3).replace(/^0\./, ".")}</span><span className="text-base font-extrabold tabular-nums text-zinc-950">{fmtWrcPlus(batter.wrcPlus)}</span></Link></li>; })}</ol> : <p className="mt-3 text-sm text-zinc-500">該当者なし</p>}</section>;
    })}</div>
    <p className="mt-5 text-xs leading-relaxed text-zinc-500">万能型は出塁率・ISOが各リーグ上位28%以内、長打型・出塁型は各指標が上位28%以内、コンタクト型は打率と三振率を基準に分類しています。</p>
  </div>;
}
