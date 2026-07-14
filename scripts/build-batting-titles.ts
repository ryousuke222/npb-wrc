/**
 * 既存のdata/{year}.jsonから、年度・リーグごとの打撃タイトル
 * （首位打者・本塁打王・打点王・盗塁王）を計算し、該当打者にtitlesを付与する。
 * 新規スクレイピングは不要（既存の打率・本塁打・打点・盗塁データのみで算出）。
 *
 * 首位打者は規定打席到達者(qualified)のみが対象。本塁打王・打点王・盗塁王は
 * 規定打席の制約なし（実際のNPBの表彰基準に合わせる）。同数の場合は該当者全員に付与する。
 *
 * 実行: npx tsx scripts/build-batting-titles.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BatterRanking, LeagueKey, YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const LEAGUES: LeagueKey[] = ["central", "pacific"];

function assignTitle(
  batters: BatterRanking[],
  getValue: (b: BatterRanking) => number,
  title: string,
  requireQualified: boolean
) {
  const pool = requireQualified ? batters.filter((b) => b.qualified) : batters;
  if (pool.length === 0) return;
  const max = Math.max(...pool.map(getValue));
  if (max <= 0) return;
  for (const b of pool) {
    if (getValue(b) === max) {
      b.titles = [...(b.titles ?? []), title];
    }
  }
}

async function main() {
  const files = (await readdir(DATA_DIR)).filter((f) => /^\d{4}\.json$/.test(f));
  let taggedRows = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const yearData: YearData = JSON.parse(await readFile(filePath, "utf-8"));

    // ベストナイン（build-best-nine.tsが別途付与）は保持したまま、
    // 本スクリプトが管理する成績ベースのタイトルだけをリセットする
    for (const b of yearData.batters) {
      const preserved = (b.titles ?? []).filter((t) => t === "ベストナイン");
      if (preserved.length > 0) b.titles = preserved;
      else delete b.titles;
    }

    for (const league of LEAGUES) {
      const leagueBatters = yearData.batters.filter((b) => b.league === league);
      if (leagueBatters.length === 0) continue;

      assignTitle(leagueBatters, (b) => b.avg, "首位打者", true);
      assignTitle(leagueBatters, (b) => b.hr, "本塁打王", false);
      assignTitle(leagueBatters, (b) => b.rbi, "打点王", false);
      assignTitle(leagueBatters, (b) => b.sb, "盗塁王", false);
    }

    taggedRows += yearData.batters.filter((b) => b.titles).length;
    await writeFile(filePath, JSON.stringify(yearData, null, 0), "utf-8");
  }

  console.log(`完了。タイトルを付与した行: ${taggedRows}件`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
