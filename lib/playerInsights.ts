import { getAllBatters } from "./data";
import type { BatterRanking } from "./types";

let qualifiedSeasonsPromise: Promise<BatterRanking[]> | null = null;

async function getQualifiedSeasons() {
  if (!qualifiedSeasonsPromise) {
    qualifiedSeasonsPromise = getAllBatters().then((batters) =>
      batters.filter((batter) => batter.qualified && batter.pa >= 250).sort((a, b) => a.wrcPlus - b.wrcPlus)
    );
  }
  return qualifiedSeasonsPromise;
}

/** wRC+が近い候補だけを比較し、OPS・本塁打・打席数も加味して似たシーズンを返す。 */
export async function getSimilarSeasons(target: BatterRanking): Promise<BatterRanking[]> {
  const seasons = await getQualifiedSeasons();
  let low = 0;
  let high = seasons.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (seasons[middle].wrcPlus < target.wrcPlus) low = middle + 1;
    else high = middle;
  }
  const candidates = seasons.slice(Math.max(0, low - 140), Math.min(seasons.length, low + 140));
  return candidates
    .filter((candidate) => !(candidate.year === target.year && candidate.rank === target.rank))
    .sort((a, b) => {
      const score = (candidate: BatterRanking) =>
        Math.abs(candidate.wrcPlus - target.wrcPlus) / 20 +
        Math.abs(candidate.ops - target.ops) / 0.05 +
        Math.abs(candidate.hr - target.hr) / 8 +
        Math.abs(candidate.pa - target.pa) / 100;
      return score(a) - score(b);
    })
    .slice(0, 3);
}
