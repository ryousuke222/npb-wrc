import type { BatterRanking } from "./types";

/**
 * 選手を年度横断でまとめるための内部キー。
 *
 * NPB公式の選手ID（nameKey）がある行は、改名・移籍後も同一人物として追跡する。
 * 一方でIDが未解決の行を名前だけでまとめると、同姓の外国人選手を誤って同一人物に
 * してしまう（例: 年代・球団が異なる「ガルシア」）。未解決行は安全側に倒し、
 * 年度・球団まで含めた一意キーとして扱う。
 */
export function playerIdentityKey(
  batter: Pick<BatterRanking, "name" | "nameKey" | "year" | "teamId">
): string {
  if (batter.nameKey) return batter.nameKey;

  const name = batter.name.normalize("NFKC").replace(/[\s　]/g, "");
  return `unresolved:${name}|${batter.year}|${batter.teamId}`;
}
