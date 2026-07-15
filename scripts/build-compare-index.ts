import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CompareBatterRow, CompareIndex, ComparePreset } from "../lib/compare";
import type { BatterRanking, YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const OUT_PATH = path.join(process.cwd(), "public", "compare-index.json");

function normalizedName(value: string): string {
  return value.normalize("NFKC").replace(/[\s　]/g, "");
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function findSeasonId(
  batters: BatterRanking[],
  year: number,
  name: string
): string | null {
  const target = normalizedName(name);
  const batter = batters.find(
    (row) => row.year === year && normalizedName(row.name) === target
  );
  return batter ? `${batter.year}-${batter.rank}` : null;
}

function makePreset(
  batters: BatterRanking[],
  label: string,
  seasons: { year: number; name: string }[]
): ComparePreset | null {
  const ids = seasons
    .map(({ year, name }) => findSeasonId(batters, year, name))
    .filter((id): id is string => id !== null);
  return ids.length >= 2 ? { label, ids } : null;
}

async function main() {
  const years = JSON.parse(
    await readFile(path.join(DATA_DIR, "years.json"), "utf-8")
  ) as number[];
  const allBatters: BatterRanking[] = [];
  const rows: CompareBatterRow[] = [];

  for (const year of years) {
    const raw = await readFile(path.join(DATA_DIR, `${year}.json`), "utf-8").catch(
      () => null
    );
    if (!raw) continue;
    const data = JSON.parse(raw) as YearData;

    for (const batter of data.batters) {
      allBatters.push(batter);
      rows.push([
        batter.year,
        batter.rank,
        batter.name,
        batter.teamId,
        batter.teamName,
        batter.league,
        batter.qualified,
        round(batter.wrcPlus, 4),
        round(batter.woba, 6),
        batter.parkFactor === null ? null : round(batter.parkFactor, 6),
        batter.pa,
        round(batter.avg, 3),
        round(batter.obp, 3),
        round(batter.slg, 3),
        round(batter.ops, 3),
        batter.hr,
        batter.rbi,
        batter.sb,
      ]);
    }
  }

  const presets = [
    makePreset(allBatters, "王貞治 1973 vs 村上宗隆 2022", [
      { year: 1973, name: "王貞治" },
      { year: 2022, name: "村上宗隆" },
    ]),
    makePreset(allBatters, "松井秀喜 2002 vs 柳田悠岐 2015", [
      { year: 2002, name: "松井秀喜" },
      { year: 2015, name: "柳田悠岐" },
    ]),
  ].filter((preset): preset is ComparePreset => preset !== null);

  const index: CompareIndex = { rows, presets };
  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(index), "utf-8");
  console.log(`wrote ${rows.length} player seasons to ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
