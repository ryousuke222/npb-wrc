import {
  getActiveRosterNames,
  getAllBatters,
  getAvailableYears,
} from "@/lib/data";
import AllTimeView from "@/app/components/AllTimeView";
import PageIntro from "@/app/components/PageIntro";

export const metadata = {
  title: "歴代最強打者ランキング | NPB最強打者ランキング",
  description:
    "NPB全シーズンを横断した、シーズン単位と打席数加重の通算wRC+による歴代最強打者ランキング。",
};

export default async function AllTimePage() {
  const [batters, years, activeRosterNames] = await Promise.all([
    getAllBatters(),
    getAvailableYears(),
    getActiveRosterNames(),
  ]);

  const oldestYear = years[years.length - 1];
  const newestYear = years[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <PageIntro
        title="歴代最強打者ランキング"
        description={`${oldestYear}〜${newestYear}年。単年と通算wRC+を切り替えて見られます。`}
      />
      <AllTimeView batters={batters} activeRosterNames={activeRosterNames} />
    </div>
  );
}
