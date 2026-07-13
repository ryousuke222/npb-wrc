import Link from "next/link";
import {
  getActiveRosterNames,
  getAllBatters,
  getAvailableYears,
  getLatestYear,
} from "@/lib/data";
import AllTimeView from "@/app/components/AllTimeView";

export const metadata = {
  title: "歴代最強打者ランキング | NPB最強打者ランキング",
  description:
    "NPB全シーズンを横断した、wRC+によるシーズン単位の歴代最強打者ランキング。",
};

export default async function AllTimePage() {
  const [batters, years, latestYear, activeRosterNames] = await Promise.all([
    getAllBatters(),
    getAvailableYears(),
    getLatestYear(),
    getActiveRosterNames(),
  ]);

  const oldestYear = years[years.length - 1];
  const newestYear = years[0];

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
          歴代最強打者ランキング
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {oldestYear}〜{newestYear}年の全シーズンを横断した、wRC+（簡易版）によるシーズン単位のランキングです
        </p>
      </div>

      <AllTimeView batters={batters} activeRosterNames={activeRosterNames} />
    </div>
  );
}
