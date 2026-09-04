import { notFound } from "next/navigation";
import PageIntro from "@/app/components/PageIntro";
import RecentRankingList from "@/app/components/RecentRankingList";
import { getRecentTenGameRanking } from "@/lib/recent";

export const metadata = {
  title: "直近10試合ランキング | NPB最強打者ランキング",
  description: "各球団の直近10試合前後の成績をOPSで比較するNPB打者ランキング。",
};

export default async function RecentPage() {
  const ranking = await getRecentTenGameRanking();
  if (!ranking) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <PageIntro
        title="直近10試合ランキング"
        description="各球団の10試合前後の成績を、OPSで比較。短い期間で調子を上げている打者を見つけられます。"
        meta={`データ基準日：${ranking.reference}・球団試合数×3.1打席以上`}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight text-zinc-900">セ・リーグ</h2>
            <span className="text-[11px] font-medium text-zinc-500">OPS TOP10</span>
          </div>
          <RecentRankingList rows={ranking.central} />
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight text-zinc-900">パ・リーグ</h2>
            <span className="text-[11px] font-medium text-zinc-500">OPS TOP10</span>
          </div>
          <RecentRankingList rows={ranking.pacific} />
        </section>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">球団ごとに10試合以上前の最も近い日次保存値との差分を使うため、対象は10〜12試合になる場合があります。</p>
    </div>
  );
}
