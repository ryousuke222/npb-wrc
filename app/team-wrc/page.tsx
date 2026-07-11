import { Suspense } from "react";
import { getAllTeamWrc } from "@/lib/data";
import TeamWrcView from "@/app/components/TeamWrcView";

export const metadata = {
  title: "チームwRC+一覧 | NPB最強打者ランキング",
  description:
    "年度・球団別のチームwRC+（投手の代打成績も含むチーム打線全体の攻撃力をリーグ平均100として指数化した値）のランキング・一覧。",
};

export default async function TeamWrcPage() {
  const entries = await getAllTeamWrc();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">チームwRC+一覧</h1>
      <p className="mt-1 text-sm text-zinc-500">
        年度・球団ごとのチームwRC+（そのチームの全打者＝投手の代打成績も含む、を合算した
        「チーム打線」全体の攻撃力を、パークファクター補正のうえリーグ平均100として指数化した値）です。
        個人のwRC+と同じ算出式を、チーム全体の合算成績に適用しています。
      </p>

      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-zinc-400">読み込み中…</p>}>
          <TeamWrcView entries={entries} />
        </Suspense>
      </div>
    </div>
  );
}
