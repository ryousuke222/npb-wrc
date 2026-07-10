import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const OUT_PATH = path.join(process.cwd(), "public", "search-index.json");

export interface SearchEntry {
  name: string;
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

  // 選手名ごとに最新の出場エントリを残す。同一年度内の重複（トレード等）は
  // その年度でwRC+が最も高い方（配列の先頭側）を優先する。
  const latestByName = new Map<
    string,
    { year: number; rank: number; teamName: string }
  >();
  const seasonCountByName = new Map<string, Set<number>>();

  for (const year of years) {
    const raw = await readFile(
      path.join(DATA_DIR, `${year}.json`),
      "utf-8"
    ).catch(() => null);
    if (!raw) continue;
    const data = JSON.parse(raw) as YearData;

    for (const b of data.batters) {
      const seasons = seasonCountByName.get(b.name) ?? new Set<number>();
      seasons.add(b.year);
      seasonCountByName.set(b.name, seasons);

      const existing = latestByName.get(b.name);
      if (!existing || existing.year < b.year) {
        latestByName.set(b.name, {
          year: b.year,
          rank: b.rank,
          teamName: b.teamName,
        });
      }
    }
  }

  const entries: SearchEntry[] = [...latestByName.entries()].map(
    ([name, v]) => ({
      name,
      year: v.year,
      rank: v.rank,
      teamName: v.teamName,
      seasons: seasonCountByName.get(name)?.size ?? 1,
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
