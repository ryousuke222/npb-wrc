import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAvailableYears, getYearData } from "@/lib/data";
import { formatGeneratedAtJa } from "@/lib/date";
import YearNav from "@/app/components/YearNav";
import RankingView from "@/app/components/RankingView";
import PageIntro from "@/app/components/PageIntro";

export async function generateStaticParams() {
  const years = await getAvailableYears();
  return years.map((year) => ({ year: String(year) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year}年 NPB最強打者ランキング(wRC+) | NPB最強打者ランキング`,
    description: `${year}年シーズンのNPB打者をwRC+でランキング。規定打席の有無や球団・リーグ別に絞り込んで確認できます。`,
  };
}

export default async function YearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();

  const [years, data] = await Promise.all([
    getAvailableYears(),
    getYearData(year),
  ]);

  if (!data) notFound();
  const isLatestYear = year === years[0];
  const generatedAt = isLatestYear ? formatGeneratedAtJa(data.generatedAt) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-3xl">
      <PageIntro
        title={`${year}年 NPB最強打者ランキング`}
        description="wRC+順。打席数やリーグ・球団で絞り込めます。"
        meta={
          isLatestYear &&
          (generatedAt || !data.seasonComplete) && (
            <>
              {generatedAt && `最終更新：${generatedAt}（日本時間）`}
              {generatedAt && !data.seasonComplete && "・"}
              {!data.seasonComplete && "シーズン途中の暫定値"}
            </>
          )
        }
        actions={<YearNav years={years} currentYear={year} />}
      />
      <RankingView
        batters={data.batters}
        regulationPaThreshold={data.regulationPaThreshold}
      />
    </div>
  );
}
