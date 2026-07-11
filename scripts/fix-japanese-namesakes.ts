/**
 * 同姓同名の日本人選手が別人なのに同じ表記でdata/*.jsonに混在している問題に対応するスクリプト。
 *
 * 外国人選手（fix-ambiguous-batter-names.ts）と違い、日本人選手はもともとフルネーム
 * （姓＋名）表示のため、npb.jp側にも「Ｘ．」のような追加の区別表記が存在しない。
 * そのため表示名（name）はそのまま変更せず、npb.jpの選手個別ID（プロ野球在籍者名簿の
 * playerId）を使った内部識別キー（nameKey）だけを該当行に付与する。年度別成績の推移
 * （getPlayerHistory）等の名寄せ判定はnameKeyを優先して使うことで、無関係な同姓同名の
 * 選手同士が1人として混ざるのを防ぐ（表示上は今まで通りフルネームのみ）。
 *
 * 実行: npx tsx scripts/fix-japanese-namesakes.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  parseRegistryIndex,
  parseYearsTeamText,
  type RegistryEntry,
} from "../lib/npbHistorical";
import { teamIdFromGameName, type TeamId } from "../lib/teams";
import type { YearData } from "../lib/types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const DATA_DIR = path.join(process.cwd(), "data");
const REQUEST_DELAY_MS = 200;

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

async function fetchCached(url: string, cacheKey: string): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, cacheKey);
  try {
    return await readFile(cachePath, "utf-8");
  } catch {
    // no cache
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "npb-wrc-ranking-personal-project/1.0" },
  });
  if (!res.ok) {
    await sleep(REQUEST_DELAY_MS);
    return null;
  }
  const html = await res.text();
  await writeFile(cachePath, html, "utf-8").catch(() => {});
  await sleep(REQUEST_DELAY_MS);
  return html;
}

async function main() {
  console.log("[1/3] プロ野球在籍者名簿(50音順)を取得中...");
  const allEntries: RegistryEntry[] = [];
  for (const kana of KANA_LIST) {
    const html = await fetchCached(
      `https://npb.jp/history/register/index_${kana}.html`,
      `history-register-${kana}.html`
    );
    if (!html) continue;
    allEntries.push(...parseRegistryIndex(html));
  }
  console.log(`  登録選手数: ${allEntries.length}`);

  console.log("[2/3] 同姓同名の日本人選手を特定し年度別チーム所属テキストを解決中...");
  const byName = new Map<string, RegistryEntry[]>();
  for (const e of allEntries) {
    if (!e.name.includes("　")) continue; // 日本人名（全角スペース区切り）のみ対象
    const list = byName.get(e.name) ?? [];
    list.push(e);
    byName.set(e.name, list);
  }

  // name -> ( "year_teamId" -> playerId )
  const resolutionByName = new Map<string, Map<string, string>>();
  let dupeGroups = 0;
  let collisions = 0;

  for (const [name, entries] of byName) {
    const distinctIds = new Set(entries.map((e) => e.playerId));
    if (distinctIds.size <= 1) continue;
    dupeGroups++;

    const lookup = new Map<string, string>();
    for (const entry of entries) {
      for (const { years, teamText } of parseYearsTeamText(entry.yearsText)) {
        const teamId = teamIdFromGameName(teamText);
        if (!teamId) continue;
        for (const year of years) {
          const key = `${year}_${teamId}`;
          const existing = lookup.get(key);
          if (existing && existing !== entry.playerId) {
            collisions++;
            continue;
          }
          lookup.set(key, entry.playerId);
        }
      }
    }
    resolutionByName.set(name, lookup);
  }
  console.log(
    `  同姓同名グループ: ${dupeGroups}件、解決不能な衝突: ${collisions}件`
  );

  console.log("[3/3] data/*.json を更新中...");
  const files = (await readdir(DATA_DIR)).filter((f) => /^\d{4}\.json$/.test(f));
  let taggedRows = 0;
  let stillUnresolvedRows = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const yearData: YearData = JSON.parse(await readFile(filePath, "utf-8"));
    let changed = false;

    for (const b of yearData.batters) {
      const lookup = resolutionByName.get(b.name);
      if (!lookup) continue;
      const playerId = lookup.get(`${b.year}_${b.teamId as TeamId}`);
      if (playerId) {
        b.nameKey = playerId;
        changed = true;
        taggedRows++;
      } else {
        stillUnresolvedRows++;
      }
    }

    if (changed) {
      await writeFile(filePath, JSON.stringify(yearData, null, 0), "utf-8");
    }
  }

  console.log(
    `完了。識別キーを付与した行: ${taggedRows}件、解決できず未対応のまま残った行: ${stillUnresolvedRows}件`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
