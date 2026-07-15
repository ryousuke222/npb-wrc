import type { Metadata } from "next";
import Link from "next/link";
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
  const generatedAt = formatGeneratedAtJa(data.generatedAt);

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
          {(generatedAt || !data.seasonComplete) && (
            <p className="mt-1 text-xs font-medium text-zinc-400">
              {generatedAt && `最終更新：${generatedAt}（日本時間）`}
              {generatedAt && !data.seasonComplete && "・"}
              {!data.seasonComplete && "シーズン途中の暫定値"}
            </p>
          )}
        </div>
        <YearNav years={years} currentYear={year} />
      </div>

      <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-600">
        <span className="font-bold text-zinc-800">wRC+の見方：</span>
        100がリーグ平均。120なら、球場補正後の得点創出力が平均より約20%高い目安です。
        <Link
          href="/about#wrc-plus"
          className="ml-1 font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-950"
        >
          算出方法を見る
        </Link>
      </div>

      <RankingView
        batters={data.batters}
        regulationPaThreshold={data.regulationPaThreshold}
      />
    </div>
  );
}
