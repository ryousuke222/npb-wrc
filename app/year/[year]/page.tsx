import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAvailableYears, getYearData } from "@/lib/data";
import { formatGeneratedAtJa } from "@/lib/date";
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
  const isLatestYear = year === years[0];
  const generatedAt = isLatestYear ? formatGeneratedAtJa(data.generatedAt) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {year}年 NPB最強打者ランキング
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            wRC+（簡易版）による打者ランキング（打席数の条件は変更できます）
          </p>
          {isLatestYear && (generatedAt || !data.seasonComplete) && (
            <p className="mt-1 text-xs font-medium text-zinc-400">
              {generatedAt && `最終更新：${generatedAt}（日本時間）`}
              {generatedAt && !data.seasonComplete && "・"}
              {!data.seasonComplete && "シーズン途中の暫定値"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/year/${year}/share-image`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
          >
            投稿用画像
          </a>
          <YearNav years={years} currentYear={year} />
        </div>
      </div>
      <RankingView
        batters={data.batters}
        regulationPaThreshold={data.regulationPaThreshold}
      />
    </div>
  );
}
