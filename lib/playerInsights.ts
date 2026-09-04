import { getAllBatters } from "./data";
import type { BatterRanking } from "./types";

export type SameAgeComparison = {
  age: number;
  rank: number;
  total: number;
  leaders: BatterRanking[];
};

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

/**
 * 同じ年齢で規定打席に到達した全シーズンを横断し、wRC+順位と上位選手を返す。
 * 同率は同順位として扱い、対象選手が上位5人の外なら比較用に本人も末尾へ加える。
 */
export async function getSameAgeComparison(
  target: BatterRanking
): Promise<SameAgeComparison | null> {
  if (target.age === undefined || !target.qualified) return null;

  const seasons = (await getQualifiedSeasons())
    .filter((season) => season.age === target.age)
    .sort(
      (a, b) =>
        b.wrcPlus - a.wrcPlus ||
        b.ops - a.ops ||
        b.pa - a.pa ||
        a.year - b.year
    );
  if (seasons.length === 0) return null;

  const rank =
    seasons.filter((season) => season.wrcPlus > target.wrcPlus).length + 1;
  const targetIndex = seasons.findIndex(
    (season) => season.year === target.year && season.rank === target.rank
  );
  if (targetIndex === -1) return null;

  const leaders = seasons.slice(0, 5);
  if (!leaders.some((season) => season.year === target.year && season.rank === target.rank)) {
    leaders.push(seasons[targetIndex]);
  }

  return { age: target.age, rank, total: seasons.length, leaders };
}
