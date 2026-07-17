import { Suspense } from "react";
import { getAllTeamWrc } from "@/lib/data";
import TeamWrcView from "@/app/components/TeamWrcView";
import PageIntro from "@/app/components/PageIntro";

export const metadata = {
  title: "チームwRC+一覧 | NPB最強打者ランキング",
  description:
    "年度・球団別のチームwRC+（投手の代打成績も含むチーム打線全体の攻撃力をリーグ平均100として指数化した値）のランキング・一覧。",
};

export default async function TeamWrcPage() {
  const entries = await getAllTeamWrc();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-3xl">
      <PageIntro
        title="チームwRC+一覧"
        description="球団単位で合算した打線の得点創出力を、リーグ平均100として比較します。"
      />

      <div>
        <Suspense fallback={<p className="text-sm text-zinc-400">読み込み中…</p>}>
          <TeamWrcView entries={entries} />
        </Suspense>
      </div>
      <details className="mt-5 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-700">
          チームwRC+について
        </summary>
        <p className="mt-2 leading-relaxed">
          投手の代打成績を含む全打者の成績を合算し、個人と同じ考え方でパークファクター補正を適用しています。
        </p>
      </details>
    </div>
  );
}
