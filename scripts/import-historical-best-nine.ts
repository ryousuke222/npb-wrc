/**
 * data-man.comの歴代ベストナイン一覧から、NPB公式投票ページが存在しない
 * 1955〜2001年の受賞者を取り込み、build-best-nine.ts用の固定データを作る。
 *
 * 実行: npx tsx scripts/import-historical-best-nine.ts <保存済みHTML>
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import type { LeagueKey } from "../lib/types";

type HistoricalBestNineWinner = {
  year: number;
  league: LeagueKey;
  position: string;
  name: string;
  teamText: string;
};

const START_YEAR = 1955;
const END_YEAR = 2001;
const POSITIONS_BY_COLUMN = [
  "投手",
  "捕手",
  "一塁手",
  "二塁手",
  "三塁手",
  "遊撃手",
  "外野手",
  "外野手",
  "外野手",
  "DH",
] as const;

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath) {
    console.error("使い方: npx tsx scripts/import-historical-best-nine.ts <保存済みHTML>");
    process.exit(1);
  }

  const $ = cheerio.load(await readFile(sourcePath, "utf-8"));
  const winners: HistoricalBestNineWinner[] = [];

  for (const [tableIndex, league] of [[0, "central"], [1, "pacific"]] as const) {
    $("table").eq(tableIndex).find("tr").slice(1).each((_, row) => {
      const cells = $(row).children("th, td");
      const year = Number(cells.eq(0).text().trim());
      if (year < START_YEAR || year > END_YEAR) return;

      cells.slice(1).each((column, cell) => {
        const position = POSITIONS_BY_COLUMN[column];
        if (!position || position === "投手") return;

        const text = $(cell).text().replace(/[\s　]/g, "").trim();
        const match = text.match(/^(.*?)\((.*?)\/[^/()]+\)$/);
        if (!match) throw new Error(`${year}年 ${league}: 受賞者を解析できません: ${text}`);

        winners.push({
          year,
          league,
          position,
          name: match[1],
          teamText: match[2],
        });
      });
    });
  }

  if (winners.length !== 779) {
    throw new Error(`受賞者数が想定外です: ${winners.length}件`);
  }

  const outputPath = path.join(process.cwd(), "data", "best-nine-history.json");
  await writeFile(outputPath, `${JSON.stringify(winners, null, 2)}\n`, "utf-8");
  console.log(`完了。${winners.length}件を ${outputPath} に保存`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
