/**
 * NPB公式の選手個別IDを、全打者行の内部識別キー(nameKey)として付与するスクリプト。
 *
 * 同姓同名の別人を分離するだけでなく、改名（例: 矢野 輝弘 → 矢野 燿大）で
 * 表記が変わった同一選手を通算・年度推移でまとめるために使う。名簿の改名履歴と
 * 在籍年度・球団が一致した場合だけIDを付与するため、名前だけで別人を結合しない。
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

function normalizeName(name: string): string {
  return name.normalize("NFKC").replace(/[\s　]/g, "");
}

/** 名簿の「［改名］～09旧名,10～新名」から歴代の登録名を取り出す。 */
function aliasesForEntry(entry: RegistryEntry): string[] {
  const aliases = new Set([entry.name]);
  const renamed = entry.yearsText.split("［改名］")[1];
  if (!renamed) return [...aliases];

  for (const part of renamed.split(",")) {
    const name = part
      .trim()
      .replace(/^(?:\d{2}(?:[～~]\d{2})?|[～~]\d{2})[^\p{Script=Han}々ヶァ-ヶＡ-ＺA-Z]*/u, "")
      .trim();
    if (name) aliases.add(name);
  }
  return [...aliases];
}

type IdentityCandidate = {
  playerId: string;
  seasonTeams: Set<string>;
};

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

  console.log("[2/3] 改名履歴・在籍年度・球団から選手IDの解決表を構築中...");
  const candidatesByAlias = new Map<string, IdentityCandidate[]>();
  for (const entry of allEntries) {
    const seasonTeams = new Set<string>();
    const careerText = entry.yearsText.split("［改名］")[0];
    for (const { years, teamText } of parseYearsTeamText(careerText)) {
      const teamId = teamIdFromGameName(teamText);
      if (!teamId) continue;
      for (const year of years) seasonTeams.add(`${year}_${teamId}`);
    }
    if (seasonTeams.size === 0) continue;

    for (const alias of aliasesForEntry(entry)) {
      const key = normalizeName(alias);
      const candidates = candidatesByAlias.get(key) ?? [];
      candidates.push({ playerId: entry.playerId, seasonTeams });
      candidatesByAlias.set(key, candidates);
    }
  }

  // 従来の同姓同名判定も残す。改名履歴が記載されていない古いデータを
  // 取りこぼさず、同一表記の別人も確実に分離するため。
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
  let conflicts = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const yearData: YearData = JSON.parse(await readFile(filePath, "utf-8"));
    let changed = false;

    for (const b of yearData.batters) {
      const seasonTeam = `${b.year}_${b.teamId}`;
      const matches = (candidatesByAlias.get(normalizeName(b.name)) ?? []).filter((candidate) =>
        candidate.seasonTeams.has(seasonTeam)
      );
      const ids = [...new Set(matches.map((candidate) => candidate.playerId))];
      if (ids.length === 1) {
        if (b.nameKey && b.nameKey !== ids[0]) {
          conflicts++;
          continue;
        }
        if (b.nameKey !== ids[0]) {
          b.nameKey = ids[0];
          changed = true;
          taggedRows++;
        }
        continue;
      }

      const lookup = resolutionByName.get(b.name);
      if (!lookup) continue;
      const playerId = lookup.get(`${b.year}_${b.teamId as TeamId}`);
      if (playerId) {
        if (!b.nameKey) {
          b.nameKey = playerId;
          changed = true;
          taggedRows++;
        }
      } else {
        stillUnresolvedRows++;
      }
    }

    if (changed) {
      await writeFile(filePath, JSON.stringify(yearData, null, 0), "utf-8");
    }
  }

  console.log(
    `完了。識別キーを付与した行: ${taggedRows}件、解決できず未対応のまま残った行: ${stillUnresolvedRows}件、既存IDとの不一致: ${conflicts}件`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
