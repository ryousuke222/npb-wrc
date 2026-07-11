/**
 * 同姓の外国人選手が別人なのに同じ表記（例:「ソト」）でdata/*.jsonに混在している問題を
 * 修正するスクリプト。
 *
 * npb.jpの選手一覧（球団の個人打撃成績ページ）は、その年その球団に同姓の選手が
 * 複数いない限り姓のみで表示するため、時代の異なる同姓の外国人選手（例: 2011,12年
 * 中日のＥ．ソトと2018〜25年DeNA/ロッテのＮ．ソト）が同じ「ソト」という名前文字列で
 * 保存されてしまっている。
 *
 * npb.jpの「プロ野球在籍者名簿」（/history/register/index_*.html）には、頭文字付きの
 * フルネーム（例:「Ｅ．ソト」）と個別の在籍年・球団テキストが載っているため、これを使って
 * data/*.json側の該当年度・該当球団の行を頭文字付きの表記に書き換える。
 *
 * 実行: npx tsx scripts/fix-ambiguous-batter-names.ts
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, html, "utf-8");
  await sleep(REQUEST_DELAY_MS);
  return html;
}

/** 「Ｅ．ソト」→「ソト」のように頭文字プレフィックスを取り除く */
function stripInitial(name: string): string {
  return name.replace(/^[Ａ-Ｚ]．/, "");
}

/** 姓のみのカタカナ表記（外国人選手にありがちな曖昧表記）かどうかの粗い判定 */
function isBareKatakanaName(name: string): boolean {
  return /^[ァ-ヶー・Ａ-Ｚ．]+$/.test(name) && !name.includes("　");
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

  console.log("[2/3] 曖昧な同姓選手を特定し年度別チーム所属テキストを解決中...");
  const byBare = new Map<string, RegistryEntry[]>();
  for (const e of allEntries) {
    const bare = stripInitial(e.name);
    if (!isBareKatakanaName(bare)) continue;
    const list = byBare.get(bare) ?? [];
    list.push(e);
    byBare.set(bare, list);
  }

  // bareName -> ( "year_teamId" -> 頭文字付きの正しい表記 )
  const resolutionByBare = new Map<string, Map<string, string>>();
  let ambiguousGroups = 0;
  let collisions = 0;

  for (const [bare, entries] of byBare) {
    const distinctIds = new Set(entries.map((e) => e.playerId));
    if (distinctIds.size <= 1) continue;
    ambiguousGroups++;

    const lookup = new Map<string, string>();
    for (const entry of entries) {
      for (const { years, teamText } of parseYearsTeamText(entry.yearsText)) {
        const teamId = teamIdFromGameName(teamText);
        if (!teamId) continue;
        for (const year of years) {
          const key = `${year}_${teamId}`;
          const existing = lookup.get(key);
          if (existing && existing !== entry.name) {
            collisions++;
            continue; // 解決不能な衝突は既存の割り当てを維持（ベストエフォート）
          }
          lookup.set(key, entry.name);
        }
      }
    }
    resolutionByBare.set(bare, lookup);
  }
  console.log(
    `  曖昧な姓: ${ambiguousGroups}件、解決不能な衝突: ${collisions}件`
  );

  console.log("[3/3] data/*.json を更新中...");
  const files = (await readdir(DATA_DIR)).filter((f) => /^\d{4}\.json$/.test(f));
  let updatedRows = 0;
  let stillAmbiguousRows = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const yearData: YearData = JSON.parse(await readFile(filePath, "utf-8"));
    let changed = false;

    for (const b of yearData.batters) {
      const lookup = resolutionByBare.get(b.name);
      if (!lookup) continue;
      const resolved = lookup.get(`${b.year}_${b.teamId as TeamId}`);
      if (resolved) {
        b.name = resolved;
        changed = true;
        updatedRows++;
      } else {
        stillAmbiguousRows++;
      }
    }

    if (changed) {
      await writeFile(filePath, JSON.stringify(yearData, null, 0), "utf-8");
    }
  }

  console.log(
    `完了。表記を修正した行: ${updatedRows}件、解決できず曖昧なまま残った行: ${stillAmbiguousRows}件`
  );
  console.log(
    "注意: 検索インデックスの再生成が必要です → npm run build-search-index"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
