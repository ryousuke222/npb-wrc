import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAvailableYears, getYearData } from "@/lib/data";
import YearNav from "@/app/components/YearNav";
import RankingView from "@/app/components/RankingView";

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {year}年 NPB最強打者ランキング
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            wRC+（簡易版）による打者ランキング（打席数の条件は変更できます）
            {!data.seasonComplete && "（シーズン進行中の暫定成績）"}
          </p>
        </div>
        <YearNav years={years} currentYear={year} />
      </div>

      <RankingView
        batters={data.batters}
        regulationPaThreshold={data.regulationPaThreshold}
      />
    </div>
  );
}
