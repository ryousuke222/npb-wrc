import { notFound } from "next/navigation";
import LatestDashboard from "@/app/components/LatestDashboard";
import PageIntro from "@/app/components/PageIntro";
import { getLatestDashboardData } from "@/lib/latest";
import { formatGeneratedAtJa } from "@/lib/date";

export const metadata = {
  title: "最新ランキング | NPB最強打者ランキング",
  description: "最新シーズンのチームwRC+、セ・パ別打者ランキング、MVP候補、週次で伸びた打者をまとめて確認できます。",
};

export default async function LatestPage() {
  const dashboard = await getLatestDashboardData();
  if (!dashboard) notFound();
  const updatedAt = formatGeneratedAtJa(dashboard.data.generatedAt);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-3xl">
      <PageIntro
        title="最新ランキング"
        description="チーム・リーグ・注目打者を、いまのデータでまとめて見られます。"
        meta={
          <>
            {updatedAt && `最終更新：${updatedAt}（日本時間）`}
            {updatedAt && !dashboard.data.seasonComplete && "・"}
            {!dashboard.data.seasonComplete && "シーズン途中の暫定値"}
          </>
        }
      />
      <LatestDashboard dashboard={dashboard} />
    </div>
  );
}
