import type { Metadata } from "next";
import { Suspense } from "react";
import { getAvailableYears } from "@/lib/data";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "NPB選手・シーズン比較 | NPB最強打者ランキング",
  description:
    "王貞治、村上宗隆、松井秀喜、柳田悠岐など、NPB打者のシーズン成績を2〜3人並べてwRC+・wOBA・OPS・パークファクターで比較できます。",
};

export default async function ComparePage() {
  const years = await getAvailableYears();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">選手・シーズン比較</h1>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          1955〜{years[0]}年の打者から2〜3シーズンを選び、時代と球場を補正したwRC+を中心に比較できます。
        </p>
      </div>

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
