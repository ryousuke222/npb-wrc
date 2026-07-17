import type { Metadata } from "next";
import { Suspense } from "react";
import { getAvailableYears } from "@/lib/data";
import CompareClient from "./CompareClient";
import PageIntro from "@/app/components/PageIntro";

export const metadata: Metadata = {
  title: "NPB選手・シーズン比較 | NPB最強打者ランキング",
  description:
    "王貞治、村上宗隆、松井秀喜、柳田悠岐など、NPB打者のシーズン成績を2〜3人並べてwRC+・wOBA・OPS・パークファクターで比較できます。",
};

export default async function ComparePage() {
  const years = await getAvailableYears();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageIntro
        title="選手・シーズン比較"
        description={`1955〜${years[0]}年の打者から、最大3シーズンを並べて比べられます。`}
      />

      <Suspense
        fallback={
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">
            比較データを読み込んでいます...
          </div>
        }
      >
        <CompareClient />
      </Suspense>
    </div>
  );
}
