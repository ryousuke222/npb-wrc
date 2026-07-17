import {
  getActiveRosterNames,
  getAllBatters,
  getAvailableYears,
  getLatestYear,
} from "@/lib/data";
import AllTimeView from "@/app/components/AllTimeView";
import PageIntro from "@/app/components/PageIntro";

export const metadata = {
  title: "歴代最強打者ランキング | NPB最強打者ランキング",
  description:
    "NPB全シーズンを横断した、シーズン単位と打席数加重の通算wRC+による歴代最強打者ランキング。",
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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-3xl">
      <PageIntro
        title="歴代最強打者ランキング"
        description={`${oldestYear}〜${newestYear}年。単年と通算wRC+を切り替えて見られます。`}
        backHref={`/year/${latestYear}`}
        backLabel="年度別ランキング"
      />

      <AllTimeView batters={batters} activeRosterNames={activeRosterNames} />
    </div>
  );
}
