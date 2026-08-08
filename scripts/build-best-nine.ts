/**
 * 1955〜2001年は保存済みの歴代一覧、2002年以降はNPB.jpのベストナイン投票結果
 * ページ（/award/{year}/voting_bt9.html）から受賞者を取得し、data/{year}.jsonの
 * 該当行にtitles("ベストナイン")とbestNinePosition（受賞ポジション）を付与する。
 *
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
import { parseBestNine, type BestNineWinner } from "../lib/npbAward";
import { teamIdFromAwardAbbr } from "../lib/teams";
import type { BatterRanking, YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const UA = "npb-wrc-ranking-personal-project/1.0";
const REQUEST_DELAY_MS = 300;

const START_YEAR = 1955;
const MODERN_START_YEAR = 2002;
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
  山崎武司: "山﨑武司",
  広沢克己: "広澤克実",
  篠塚利夫: "篠塚和典",
  杉浦亨: "杉浦享",
  安藤統夫: "安藤統男",
  古葉毅: "古葉竹識",
  森永勝治: "森永勝也",
  中利夫: "中暁生",
  三宅秀史: "三宅伸和",
  イチロー: "鈴木一朗",
  田辺徳雄: "田邊徳雄",
  大石第二朗: "大石大二郎",
  金森永時: "金森栄治",
  加藤秀司: "加藤英司",
  長池徳二: "長池徳士",
  有藤通世: "有藤道世",
  岡村浩二: "岡村浩司",
  山内和弘: "山内一弘",
  清水隆行: "清水崇行", // 2003年に改名（2002年の表彰ページは旧表記）
  矢野輝弘: "矢野燿大", // 2004年に改名（2003年の表彰ページは旧表記）
  川崎宗則: "川﨑宗則", // 「崎」の異体字（﨑）表記がdata側で使われている
  SHINJO: "新庄剛志", // 2004年の登録名別表記（本名は新庄剛志）
  "W.M.ペーニャ": "Ｗ．ペーニャ", // 2012年の公式表彰ページのみミドルネーム表記
};

/** 「Ｊ・ズレータ」「Ｍ．フランコ」→「ズレータ」「フランコ」のように頭文字を取り除く */
function stripInitial(name: string): string {
  return name.replace(/^[A-ZＡ-Ｚ][.．・]\s*/, "");
}

function normalizeName(rawName: string): string {
  const name = rawName.normalize("NFKC").replace(/[\s　]/g, "");
  return stripInitial(NAME_ALIASES[name] ?? name);
}

async function main() {
  const existingFiles = new Set(await readdir(DATA_DIR));
  const historicalWinners = JSON.parse(
    await readFile(path.join(DATA_DIR, "best-nine-history.json"), "utf-8")
  ) as (BestNineWinner & { year: number })[];
  let totalWinners = 0;
  let matchedWinners = 0;
  const unmatched: string[] = [];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const fileName = `${year}.json`;
    if (!existingFiles.has(fileName)) continue;

    let winners: BestNineWinner[];
    if (year < MODERN_START_YEAR) {
      winners = historicalWinners.filter((winner) => winner.year === year);
    } else {
      const html = await fetchCached(
        `https://npb.jp/award/${year}/voting_bt9.html`,
        `award-bt9-${year}.html`
      );
      if (!html) {
        console.warn(`${year}年: ページ取得失敗`);
        continue;
      }
      winners = parseBestNine(html);
    }
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
        // 公式表彰ページの受賞ポジションは、その年度の守備位置を補う
        // 信頼できる情報として使える。DHは守備位置ではないため除外する。
        if (!b.position && winner.position !== "DH") b.position = winner.position;
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
