import { getLatestYear, getYearData } from "./data";
import type { BatterRanking } from "./types";

export type BatterArchetype = "万能型" | "長打型" | "出塁型" | "コンタクト型" | "バランス型";

export type ArchetypeEntry = {
  batter: BatterRanking;
  type: BatterArchetype;
  iso: number;
};

function percentile(pool: number[], value: number) {
  return pool.filter((candidate) => candidate <= value).length / pool.length;
}

export async function getLatestArchetypes(): Promise<{ year: number; entries: ArchetypeEntry[] } | null> {
  const year = await getLatestYear();
  const data = await getYearData(year);
  if (!data) return null;
  const qualified = data.batters.filter((batter) => batter.qualified);

  const entries = qualified.map((batter) => {
    const league = qualified.filter((candidate) => candidate.league === batter.league);
    const obpPercentile = percentile(league.map((candidate) => candidate.obp), batter.obp);
    const iso = batter.slg - batter.avg;
    const isoPercentile = percentile(league.map((candidate) => candidate.slg - candidate.avg), iso);
    const avgPercentile = percentile(league.map((candidate) => candidate.avg), batter.avg);
    const strikeoutRate = batter.pa > 0 ? batter.so / batter.pa : 1;
    const lowStrikeoutPercentile = 1 - percentile(league.map((candidate) => candidate.pa > 0 ? candidate.so / candidate.pa : 1), strikeoutRate);

    let type: BatterArchetype = "バランス型";
    if (obpPercentile >= 0.72 && isoPercentile >= 0.72) type = "万能型";
    else if (isoPercentile >= 0.72) type = "長打型";
    else if (obpPercentile >= 0.72) type = "出塁型";
    else if (avgPercentile >= 0.72 && lowStrikeoutPercentile >= 0.55) type = "コンタクト型";

    return { batter, type, iso };
  });
  return { year, entries };
}
