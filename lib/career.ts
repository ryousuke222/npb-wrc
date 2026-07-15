import type { BatterRanking } from "./types";

export interface CareerBatter {
  /** nameKeyがある場合はそれを使い、同姓同名の別選手を分離する */
  id: string;
  name: string;
  firstYear: number;
  lastYear: number;
  seasons: number;
  pa: number;
  /** 年度別wRC+を打席数で加重平均した通算値 */
  wrcPlus: number;
  /** 規定打席に到達した年のうち、wRC+が120以上だった年数 */
  seasonsAt120: number;
  latestSeason: BatterRanking;
  bestQualifiedSeason: BatterRanking | null;
}

/**
 * 年度別wRC+は各年のリーグ環境を基準にした指数なので、通算では単純平均せず
 * 打席数で加重平均する。移籍で同一年に複数行あるケースも、打席数に応じて
 * 自然に合算される。
 */
export function aggregateCareerBatters(batters: BatterRanking[]): CareerBatter[] {
  const groups = new Map<string, BatterRanking[]>();

  for (const batter of batters) {
    const id = batter.nameKey ?? batter.name;
    const group = groups.get(id);
    if (group) group.push(batter);
    else groups.set(id, [batter]);
  }

  return [...groups.entries()].map(([id, seasons]) => {
    const ordered = [...seasons].sort(
      (a, b) => a.year - b.year || b.pa - a.pa || a.rank - b.rank
    );
    const pa = ordered.reduce((total, season) => total + season.pa, 0);
    const weightedWrc = ordered.reduce(
      (total, season) => total + season.wrcPlus * season.pa,
      0
    );
    const qualified = ordered.filter((season) => season.qualified);
    const bestQualifiedSeason = qualified.reduce<BatterRanking | null>(
      (best, season) =>
        best === null || season.wrcPlus > best.wrcPlus ? season : best,
      null
    );
    const seasonsAt120 = new Set(
      qualified.filter((season) => season.wrcPlus >= 120).map((season) => season.year)
    ).size;

    return {
      id,
      name: ordered[0].name,
      firstYear: ordered[0].year,
      lastYear: ordered[ordered.length - 1].year,
      seasons: new Set(ordered.map((season) => season.year)).size,
      pa,
      wrcPlus: pa > 0 ? weightedWrc / pa : 0,
      seasonsAt120,
      latestSeason: ordered[ordered.length - 1],
      bestQualifiedSeason,
    };
  });
}
