import Link from "next/link";
import { getAllBatters, getAvailableYears, getLatestYear } from "@/lib/data";
import TitleRankingView from "@/app/components/TitleRankingView";

export const metadata = {
  title: "打撃タイトルランキング | NPB最強打者ランキング",
  description:
    "セ・リーグ／パ・リーグ別に、打率・本塁打・打点・盗塁の上位5人とベストナイン受賞者を年度ごとに確認できる打撃タイトルランキング。",
};

export default async function TitlesPage() {
  const [batters, years, latestYear] = await Promise.all([
    getAllBatters(),
    getAvailableYears(),
    getLatestYear(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/year/${latestYear}`}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← 年度別ランキングに戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          打撃タイトルランキング
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          セ・リーグ／パ・リーグ別に、打率・本塁打・打点・盗塁の上位5人とベストナイン受賞者を確認できます（年度を切り替えられます）
        </p>
      </div>

      <TitleRankingView batters={batters} years={years} initialYear={latestYear} />
    </div>
  );
}
