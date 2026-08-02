import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const OUT_PATH = path.join(process.cwd(), "public", "search-index.json");

export interface SearchEntry {
  /** NPB公式の選手個別ID。旧登録名と現登録名を同じ検索結果にまとめるために使う。 */
  id: string;
  name: string;
  /** 検索用の別名（改名前の登録名など）。表示はnameのみ。 */
  aliases?: string[];
  year: number;
  rank: number;
  teamName: string;
  /** その選手の全出場年度数（複数シーズン在籍したことが分かるように） */
  seasons: number;
}

async function main() {
  const years = JSON.parse(
    await readFile(path.join(DATA_DIR, "years.json"), "utf-8")
  ) as number[];

  // 選手IDごとに最新の出場エントリを残す。同一年度内の重複（トレード等）は
  // その年度でwRC+が最も高い方（配列の先頭側）を優先する。
  const latestById = new Map<
    string,
    { name: string; year: number; rank: number; teamName: string }
  >();
  const seasonCountById = new Map<string, Set<number>>();
  const aliasesById = new Map<string, Set<string>>();

  for (const year of years) {
    const raw = await readFile(
      path.join(DATA_DIR, `${year}.json`),
      "utf-8"
    ).catch(() => null);
    if (!raw) continue;
    const data = JSON.parse(raw) as YearData;

    for (const b of data.batters) {
      const id = b.nameKey ?? `name:${b.name}`;
      const seasons = seasonCountById.get(id) ?? new Set<number>();
      seasons.add(b.year);
      seasonCountById.set(id, seasons);
      const aliases = aliasesById.get(id) ?? new Set<string>();
      aliases.add(b.name);
      aliasesById.set(id, aliases);

      const existing = latestById.get(id);
      if (!existing || existing.year < b.year) {
        latestById.set(id, {
          name: b.name,
          year: b.year,
          rank: b.rank,
          teamName: b.teamName,
        });
      }
    }
  }

  const entries: SearchEntry[] = [...latestById.entries()].map(
    ([id, v]) => ({
      id,
      name: v.name,
      aliases: [...(aliasesById.get(id) ?? [])].filter((name) => name !== v.name),
      year: v.year,
      rank: v.rank,
      teamName: v.teamName,
      seasons: seasonCountById.get(id)?.size ?? 1,
    })
  );

  entries.sort((a, b) => a.name.localeCompare(b.name, "ja"));

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(entries), "utf-8");
  console.log(`wrote ${entries.length} players to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
