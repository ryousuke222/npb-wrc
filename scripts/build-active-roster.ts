/**
 * NPB公式の「支配下選手一覧」（現役選手から探す、/bis/players/active/index_*.html）から
 * 現在いずれかのNPB球団に登録されている選手名（育成選手含む）を取得し、
 * data/active-players.json に書き出すスクリプト。
 *
 * 歴代ランキングの「現役選手のみ」フィルターで使う。トレード・引退・新規登録で
 * 内容が変わるため、他のデータと違って永続キャッシュはせず毎回取得し直す。
 *
 * 実行: npx tsx scripts/build-active-roster.ts
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { parseActiveRosterIndex } from "../lib/npbActiveRoster";

const DATA_DIR = path.join(process.cwd(), "data");
const REQUEST_DELAY_MS = 300;

const KANA_LIST = [
  "a", "i", "u", "e", "o",
  "ka", "ki", "ku", "ke", "ko",
  "sa", "si", "su", "se", "so",
  "ta", "ti", "tu", "te", "to",
  "na", "ni", "nu", "ne", "no",
  "ha", "hi", "hu", "he", "ho",
  "ma", "mi", "mu", "me", "mo",
  "ya", "yu", "yo",
  "ra", "ri", "ru", "re", "ro",
  "wa",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("NPB支配下選手一覧(50音順)を取得中...");
  const names = new Set<string>();

  for (const kana of KANA_LIST) {
    const res = await fetch(`https://npb.jp/bis/players/active/index_${kana}.html`, {
      headers: { "User-Agent": "npb-wrc-ranking-personal-project/1.0" },
    });
    if (res.ok) {
      const html = await res.text();
      for (const entry of parseActiveRosterIndex(html)) {
        names.add(entry.name);
      }
    } else {
      console.warn(`  [warn] ${kana}: ${res.status}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const sorted = [...names].sort();
  await writeFile(
    path.join(DATA_DIR, "active-players.json"),
    JSON.stringify(sorted, null, 0),
    "utf-8"
  );
  console.log(`完了。現役選手数: ${sorted.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
