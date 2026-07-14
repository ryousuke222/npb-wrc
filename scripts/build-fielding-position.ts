/**
 * 2689web.com（個人運営、1936年〜の日本プロ野球記録サイト）の個人選手ページから
 * 守備成績（投手/捕手/一塁手/二塁手/三塁手/遊撃手/外野手の年度別出場試合数）を取得し、
 * data/{year}.jsonの各行に主に守備についたポジション（position）を付与する。
 *
 * npb.jp側の同種データ（idf1_*.html）は2005年以降のページしか存在しないため、
 * 1955年からの全期間をカバーできるこちらのサイトを使う。個人ページ1枚に選手の
 * 全年度分がまとまっているため、選手ごとに1回の取得で済む。
 *
 * 小規模な個人運営サイトのため、控えめな間隔（600ms）でアクセスする。
 *
 * 実行: npx tsx scripts/build-fielding-position.ts
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  parseBatterIndex,
  parseFieldingHistory,
  FIELDING_POSITIONS,
  type Batter2689Entry,
  type FieldingPosition,
} from "../lib/npb2689";
import type { BatterRanking, YearData } from "../lib/types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "2689web");
const DATA_DIR = path.join(process.cwd(), "data");
const REQUEST_DELAY_MS = 600;
const SITE_ROOT = "https://2689web.com";
const MAX_RETRIES = 4;

const INDEX_PAGES = ["batter1.html", "batter2.html", "batter3.html", "batter4.html", "batter5.html", "batterp.html"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const decoder = new TextDecoder("shift_jis");

async function fetchCached(url: string, cacheKey: string): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, cacheKey);
  try {
    return await readFile(cachePath, "utf-8");
  } catch {
    // no cache
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "npb-wrc-ranking-personal-project/1.0" },
      });
      if (!res.ok) {
        await sleep(REQUEST_DELAY_MS);
        return null;
      }
      const buf = await res.arrayBuffer();
      const html = decoder.decode(buf);
      await mkdir(path.dirname(cachePath), { recursive: true });
      await writeFile(cachePath, html, "utf-8");
      await sleep(REQUEST_DELAY_MS);
      return html;
    } catch (err) {
      const backoff = REQUEST_DELAY_MS * 2 ** (attempt + 1);
      console.warn(
        `  [warn] fetch failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${url} - ${(err as Error).message}. ${backoff}ms待って再試行`
      );
      await sleep(backoff);
    }
  }
  console.warn(`  [error] fetch permanently failed after retries: ${url}`);
  return null;
}

/** 「別所　昭(毅彦)」→「別所　昭」のように、旧名等の補足カッコ書きを取り除く */
function stripParenthetical(name: string): string {
  return name.replace(/[（(][^）)]*[）)]/g, "").trim();
}

/** 「Ｊ．オスナ」「J.オスナ」→「オスナ」のように頭文字プレフィックスを取り除く */
function stripInitial(name: string): string {
  return name.replace(/^[A-ZＡ-Ｚ][.．]\s*/, "");
}

function normalizeForMatch(rawName: string): string {
  const name = stripParenthetical(rawName);
  if (name.includes("　")) return name;
  return stripInitial(name);
}

function primaryPosition(games: Partial<Record<FieldingPosition, number>>): FieldingPosition | null {
  let best: FieldingPosition | null = null;
  let bestGames = 0;
  for (const pos of FIELDING_POSITIONS) {
    const g = games[pos] ?? 0;
    if (g > bestGames) {
      bestGames = g;
      best = pos;
    }
  }
  return best;
}

async function main() {
  console.log("[1/4] 選手一覧ページを取得中...");
  const allEntries: Batter2689Entry[] = [];
  for (const page of INDEX_PAGES) {
    const html = await fetchCached(`${SITE_ROOT}/ind/${page}`, `index-${page}`);
    if (!html) continue;
    allEntries.push(...parseBatterIndex(html));
  }
  console.log(`  登録選手数: ${allEntries.length}`);

  const byMatchKey = new Map<string, Batter2689Entry[]>();
  for (const e of allEntries) {
    const key = normalizeForMatch(e.name);
    const list = byMatchKey.get(key) ?? [];
    list.push(e);
    byMatchKey.set(key, list);
  }

  console.log("[2/4] data/*.jsonを読み込み、選手ごとに在籍年度をまとめ中...");
  const files = (await readdir(DATA_DIR)).filter((f) => /^\d{4}\.json$/.test(f));
  const yearDataByFile = new Map<string, YearData>();
  const groupYears = new Map<string, Set<number>>(); // groupKey(nameKey??name) -> years

  for (const file of files) {
    const yearData: YearData = JSON.parse(await readFile(path.join(DATA_DIR, file), "utf-8"));
    yearDataByFile.set(file, yearData);
    for (const b of yearData.batters) {
      const groupKey = b.nameKey ?? b.name;
      const years = groupYears.get(groupKey) ?? new Set<number>();
      years.add(b.year);
      groupYears.set(groupKey, years);
    }
  }
  console.log(`  対象選手グループ数: ${groupYears.size}`);

  console.log("[3/4] 各選手の2689web.comページを解決・取得中...");
  // groupKey -> resolved 2689 file
  const resolvedFile = new Map<string, string>();
  let ambiguous = 0;
  let unresolved = 0;

  // groupKeyの元になったnameを引くための逆引き（同一年度データから）
  const groupSampleName = new Map<string, string>();
  for (const yearData of yearDataByFile.values()) {
    for (const b of yearData.batters) {
      const groupKey = b.nameKey ?? b.name;
      if (!groupSampleName.has(groupKey)) groupSampleName.set(groupKey, b.name);
    }
  }

  for (const [groupKey, years] of groupYears) {
    const sampleName = groupSampleName.get(groupKey) ?? groupKey;
    const matchKey = normalizeForMatch(sampleName);
    const candidates = byMatchKey.get(matchKey) ?? [];

    if (candidates.length === 0) {
      unresolved++;
      continue;
    }
    if (candidates.length === 1) {
      resolvedFile.set(groupKey, candidates[0].file);
      continue;
    }

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const spanMatches = candidates.filter(
      (c) => c.debutYear <= minYear && c.lastYear >= maxYear
    );
    if (spanMatches.length === 1) {
      resolvedFile.set(groupKey, spanMatches[0].file);
    } else {
      ambiguous++;
    }
  }
  console.log(
    `  解決: ${resolvedFile.size} / 曖昧(スキップ): ${ambiguous} / 未検出: ${unresolved}`
  );

  console.log("[4/4] 守備成績を取得しdata/*.jsonへ反映中...");
  // groupKey -> Map<year, position>
  const positionByGroupYear = new Map<string, Map<number, FieldingPosition>>();
  let i = 0;
  for (const [groupKey, file] of resolvedFile) {
    i++;
    const html = await fetchCached(`${SITE_ROOT}/ind/${file}`, `player-${file}`);
    if (!html) continue;
    const rows = parseFieldingHistory(html);
    const yearMap = new Map<number, FieldingPosition>();
    for (const row of rows) {
      const pos = primaryPosition(row.games);
      if (pos) yearMap.set(row.year, pos);
    }
    positionByGroupYear.set(groupKey, yearMap);
    if (i % 200 === 0) console.log(`  ${i}/${resolvedFile.size}`);
  }

  let taggedRows = 0;
  for (const [file, yearData] of yearDataByFile) {
    let changed = false;
    for (const b of yearData.batters as (BatterRanking & { position?: string })[]) {
      const groupKey = b.nameKey ?? b.name;
      const yearMap = positionByGroupYear.get(groupKey);
      const pos = yearMap?.get(b.year);
      if (pos) {
        b.position = pos;
        changed = true;
        taggedRows++;
      } else {
        delete b.position;
      }
    }
    if (changed) {
      await writeFile(path.join(DATA_DIR, file), JSON.stringify(yearData, null, 0), "utf-8");
    }
  }

  console.log(`\n完了。ポジションを付与した行: ${taggedRows}件`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
