/**
 * NPB.jpのベストナイン投票結果ページ（/award/{year}/voting_bt9.html）から
 * 年度・リーグ・ポジションごとの受賞者を取得し、data/{year}.jsonの該当行に
 * titles("ベストナイン")とbestNinePosition（受賞ポジション）を付与するスクリプト。
 *
 * 対象年度は2002年（このページが存在する最初の年度）〜END_YEAR（前シーズン終了時点で更新）。
 * 進行中シーズンはまだ投票が行われていないため対象外。
 *
 * build-batting-titles.tsは成績ベースのタイトルをリセットする際にベストナインを
 * 保持するようになっているため、実行順序はどちらが先でも問題ないが、
 * 既存の運用（build-player-bio→build-fielding-position→build-batting-titles→
 * build-search-index）の最後に追加する形で実行するのが分かりやすい。
 *
 * 実行: npx tsx scripts/build-best-nine.ts
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseBestNine } from "../lib/npbAward";
import { teamIdFromAwardAbbr } from "../lib/teams";
import type { BatterRanking, YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const UA = "npb-wrc-ranking-personal-project/1.0";
const REQUEST_DELAY_MS = 300;

const START_YEAR = 2002;
const END_YEAR = 2025;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCached(url: string, cacheKey: string): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, cacheKey);
  try {
    return await readFile(cachePath, "utf-8");
  } catch {
    // cache miss
  }
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    await sleep(REQUEST_DELAY_MS);
    return null;
  }
  const html = await res.text();
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, html, "utf-8");
  await sleep(REQUEST_DELAY_MS);
  return html;
}

/**
 * 表彰ページと選手データとで表記が異なることが分かっている選手（主に改名）。
 * キーは表彰ページ側の表記（スペース除去済み）、値はdata/*.json側の表記
 */
const NAME_ALIASES: Record<string, string> = {
  清水隆行: "清水崇行", // 2003年に改名（2002年の表彰ページは旧表記）
  矢野輝弘: "矢野燿大", // 2004年に改名（2003年の表彰ページは旧表記）
  川崎宗則: "川﨑宗則", // 「崎」の異体字（﨑）表記がdata側で使われている
  ＳＨＩＮＪＯ: "新庄剛志", // 2004年の登録名別表記（本名は新庄剛志）
};

/** 「Ｊ・ズレータ」「Ｍ．フランコ」→「ズレータ」「フランコ」のように頭文字を取り除く */
function stripInitial(name: string): string {
  return name.replace(/^[A-ZＡ-Ｚ][.．・]\s*/, "");
}

function normalizeName(rawName: string): string {
  const name = rawName.replace(/[\s　]/g, "");
  return stripInitial(NAME_ALIASES[name] ?? name);
}

async function main() {
  const existingFiles = new Set(await readdir(DATA_DIR));
  let totalWinners = 0;
  let matchedWinners = 0;
  const unmatched: string[] = [];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const fileName = `${year}.json`;
    if (!existingFiles.has(fileName)) continue;

    const html = await fetchCached(
      `https://npb.jp/award/${year}/voting_bt9.html`,
      `award-bt9-${year}.html`
    );
    if (!html) {
      console.warn(`${year}年: ページ取得失敗`);
      continue;
    }

    const winners = parseBestNine(html);
    if (winners.length === 0) {
      console.warn(`${year}年: 受賞者を抽出できず`);
      continue;
    }

    const filePath = path.join(DATA_DIR, fileName);
    const yearData: YearData = JSON.parse(await readFile(filePath, "utf-8"));

    // 冪等性のため、この年度の既存のベストナイン付与を一旦クリアする
    for (const b of yearData.batters) {
      if (b.bestNinePosition) delete b.bestNinePosition;
      if (b.titles) {
        const rest = b.titles.filter((t) => t !== "ベストナイン");
        if (rest.length > 0) b.titles = rest;
        else delete b.titles;
      }
    }

    for (const winner of winners) {
      totalWinners++;
      const teamId = teamIdFromAwardAbbr(winner.teamText);
      const winnerKey = normalizeName(winner.name);

      const candidates = yearData.batters.filter(
        (b: BatterRanking) =>
          b.league === winner.league &&
          normalizeName(b.name) === winnerKey &&
          (teamId === null || b.teamId === teamId)
      );

      if (candidates.length === 0) {
        unmatched.push(
          `${year}年 ${winner.league} ${winner.position} ${winner.name}(${winner.teamText})`
        );
        continue;
      }

      matchedWinners++;
      for (const b of candidates) {
        b.bestNinePosition = winner.position;
        b.titles = [...(b.titles ?? []), "ベストナイン"];
      }
    }

    await writeFile(filePath, JSON.stringify(yearData, null, 0), "utf-8");
  }

  console.log(`完了。受賞者総数: ${totalWinners}件、一致: ${matchedWinners}件`);
  if (unmatched.length > 0) {
    console.warn(`未一致 (${unmatched.length}件):`);
    for (const line of unmatched) console.warn(`  ${line}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
