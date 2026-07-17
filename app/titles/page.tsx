import {
  getAllBatters,
  getAvailableYears,
  getLatestYear,
  getYearData,
} from "@/lib/data";
import TitleRankingView from "@/app/components/TitleRankingView";
import PageIntro from "@/app/components/PageIntro";

export const metadata = {
  title: "打撃タイトルランキング | NPB最強打者ランキング",
  description:
    "セ・リーグ／パ・リーグ別に、首位打者・最多安打・最多本塁打・最多打点・最高出塁率・最多盗塁の各1名とベストナイン受賞者を年度ごとに確認できる打撃タイトルページ。",
};

export default async function TitlesPage() {
  const [batters, years, latestYear] = await Promise.all([
    getAllBatters(),
    getAvailableYears(),
    getLatestYear(),
  ]);
  const latestYearData = await getYearData(latestYear);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-5xl">
      <PageIntro
        title="打撃タイトル"
        description="セ・パ別の6部門リーダーとベストナインを年度ごとに確認できます。"
        backHref={`/year/${latestYear}`}
        backLabel="年度別ランキング"
      />

      <TitleRankingView
        batters={batters}
        years={years}
        initialYear={latestYear}
        latestSeasonComplete={latestYearData?.seasonComplete ?? false}
      />
    </div>
  );
}
