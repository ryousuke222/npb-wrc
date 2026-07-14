/**
 * 進行中シーズンの守備ポジションを、npb.jpの個人守備成績ページ（idf1_{team}.html）
 * から取得しdata/{year}.jsonに反映する。
 *
 * 2689web.comは選手のシーズンが終わってから更新されるため、進行中シーズンは
 * 「内野手/外野手」という大まかな分類（npb.jpプロフィール由来）しか付与できない。
 * 一方このページはNPB公式が試合ごとに更新する現在進行形のデータのため、
 * 一塁手/二塁手/三塁手/遊撃手まで区別できる。
 *
 * 実行: npx tsx scripts/build-fielding-position-current.ts <year>
 * 例:   npx tsx scripts/build-fielding-position-current.ts 2026
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseTeamBattingRows, parseLiveFieldingPage } from "../lib/npbParse";
import type { BatterRanking, YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const UA = "npb-wrc-ranking-personal-project/1.0";
const REQUEST_DELAY_MS = 300;
const LEAGUE_PATH = { central: "c", pacific: "p" } as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCached(url: string, cacheKey: string, forceRefresh: boolean): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, cacheKey);
  if (!forceRefresh) {
    try {
      return await readFile(cachePath, "utf-8");
    } catch {
      // cache miss
    }
  }
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const html = await res.text();
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, html, "utf-8");
  await sleep(REQUEST_DELAY_MS);
  return html;
}

async function main() {
  const year = Number(process.argv[2]);
  if (!Number.isInteger(year)) {
    console.error("使い方: npx tsx scripts/build-fielding-position-current.ts <year>");
    process.exit(1);
  }

  const filePath = path.join(DATA_DIR, `${year}.json`);
  const yearData: YearData = JSON.parse(await readFile(filePath, "utf-8"));

  const positionByTeamName = new Map<string, string>(); // `${teamId}_${name}` -> position

  for (const league of ["central", "pacific"] as const) {
    const lp = LEAGUE_PATH[league];
    const tmbHtml = await fetchCached(
      `https://npb.jp/bis/${year}/stats/tmb_${lp}.html`,
      `${year}-tmb-${lp}.html`,
      false
    );
    if (!tmbHtml) continue;
    const teamRows = parseTeamBattingRows(tmbHtml);

    for (const team of teamRows) {
      console.log(`  ${league} ${team.teamName}(${team.code})の守備成績を取得中...`);
      const idfHtml = await fetchCached(
        `https://npb.jp/bis/${year}/stats/idf1_${team.code}.html`,
        `${year}-idf1-${team.code}.html`,
        true // 進行中シーズンなので毎回最新を取得する
      );
      if (!idfHtml) continue;

      const rows = parseLiveFieldingPage(idfHtml);
      const bestByName = new Map<string, { position: string; games: number }>();
      for (const row of rows) {
        const current = bestByName.get(row.name);
        if (!current || row.games > current.games) {
          bestByName.set(row.name, { position: row.position, games: row.games });
        }
      }
      for (const [name, best] of bestByName) {
        positionByTeamName.set(`${team.teamId}_${name}`, best.position);
      }
    }
  }

  let updated = 0;
  for (const b of yearData.batters as (BatterRanking & { position?: string })[]) {
    const pos = positionByTeamName.get(`${b.teamId}_${b.name}`);
    if (pos) {
      b.position = pos;
      updated++;
    }
  }

  await writeFile(filePath, JSON.stringify(yearData, null, 0), "utf-8");
  console.log(`\n完了。${year}年: ${updated}行を詳細ポジションで更新`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
