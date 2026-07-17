import PageIntro from "@/app/components/PageIntro";
import TeamBestNineView from "@/app/components/TeamBestNineView";
import { getAllBatters, getLatestYear } from "@/lib/data";

export const metadata = {
  title: "球団別 歴代ベストナイン | NPB最強打者ランキング",
  description: "NPB各球団の歴代ベストナインを、各ポジションの最高wRC+シーズンで選出します。",
};

export default async function TeamBestNinePage() {
  const [batters, latestYear] = await Promise.all([getAllBatters(), getLatestYear()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-5xl">
      <PageIntro
        title="球団別 歴代ベストナイン"
        description="投手を除く各ポジションで、最も高いwRC+を記録したシーズンから選ぶ球団別打撃ベストナイン。"
        backHref={`/year/${latestYear}`}
        backLabel="年度別ランキング"
      />
      <TeamBestNineView batters={batters} />
    </div>
  );
}
