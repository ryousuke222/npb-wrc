import { getAllBatters, getLatestYear } from "@/lib/data";
import PageIntro from "@/app/components/PageIntro";
import RecordsView from "@/app/components/RecordsView";

export const metadata = {
  title: "歴代シーズン記録 | NPB最強打者ランキング",
  description: "NPBの歴代シーズンをwRC+、本塁打、安打、打率、OPSで振り返る記録ページ。",
};

export default async function RecordsPage() {
  const [batters, latestYear] = await Promise.all([getAllBatters(), getLatestYear()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-3xl">
      <PageIntro
        title="歴代シーズン記録"
        description="記録で振り返る、NPB打者の突出したシーズン。"
        backHref={`/year/${latestYear}`}
        backLabel="年度別ランキング"
      />

      <RecordsView batters={batters} />
    </div>
  );
}
