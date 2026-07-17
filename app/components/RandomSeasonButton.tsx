"use client";

import { useRouter } from "next/navigation";
import type { BatterRanking } from "@/lib/types";

export default function RandomSeasonButton({
  batters,
}: {
  batters: BatterRanking[];
}) {
  const router = useRouter();

  const openRandomSeason = () => {
    const pool = batters.filter((b) => b.qualified && b.pa >= 400);
    const batter = pool[Math.floor(Math.random() * pool.length)];
    if (batter) router.push(`/year/${batter.year}/${batter.rank}?from=all-time`);
  };

  return (
    <button
      type="button"
      onClick={openRandomSeason}
      className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
    >
      ランダムなシーズン →
    </button>
  );
}
