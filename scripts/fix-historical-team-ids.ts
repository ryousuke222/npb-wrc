/**
 * 1955年のトンボユニオンズ、1956年の高橋ユニオンズは、
 * 同時期に存在した大映スターズとは別球団であるため、過去データのteamIdを分離する。
 *
 * 実行: npx tsx scripts/fix-historical-team-ids.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

const FIXES = [
  { year: 1955, teamName: "トンボ", teamId: "To" as const },
  { year: 1956, teamName: "高橋", teamId: "Ta" as const },
];

async function main() {
  let updated = 0;

  for (const fix of FIXES) {
    const filePath = path.join(DATA_DIR, `${fix.year}.json`);
    const data: YearData = JSON.parse(await readFile(filePath, "utf-8"));
    for (const batter of data.batters) {
      if (batter.teamName === fix.teamName && batter.teamId !== fix.teamId) {
        batter.teamId = fix.teamId;
        updated++;
      }
    }
    await writeFile(filePath, JSON.stringify(data), "utf-8");
  }

  console.log(`歴史球団IDを${updated}件更新しました。`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
