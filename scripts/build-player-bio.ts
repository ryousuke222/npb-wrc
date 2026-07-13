/**
 * 打者の生年月日(→年齢)・投打(右打ち/左打ち/両打ち)をNPB.jpから取得し、
 * data/{year}.json の各行に age / bats フィールドを付与するスクリプト。
 *
 * 解決方法は2段階:
 * 1. 「プロ野球在籍者名簿」(50音順、OB含む全選手・年度別所属球団テキスト付き)を使い、
 *    対象行の年度・球団と一致する選手をID解決する（完了済みシーズンはこれでほぼ解決する）。
 * 2. 1で解決できなかった行（主に進行中シーズンでの移籍・デビューなど、名簿にまだ
 *    反映されていないケース）は、選手名検索（現役検索）でフォールバックする。
 *
 * どちらでも解決できなかった行は age/bats を付与せず、そのまま空欄表示にする
 * （既存の「規定未満」バッジ等と同じ、壊れずに欠落を許容する方針）。
 *
 * 実行: npx tsx scripts/build-player-bio.ts [year...]
 * 例:   npx tsx scripts/build-player-bio.ts 2026
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import {
  parseRegistryIndex,
  parseYearsTeamText,
  type RegistryEntry,
} from "../lib/npbHistorical";
import { teamIdFromGameName, type TeamId } from "../lib/teams";
import type { BatterRanking, YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const UA = "npb-wrc-ranking-personal-project/1.0";
const REQUEST_DELAY_MS = 300;

const KANA_LIST = [
  "a", "i", "u", "e", "o", "ka", "ki", "ku", "ke", "ko", "sa", "si", "su", "se", "so",
  "ta", "ti", "tu", "te", "to", "na", "ni", "nu", "ne", "no", "ha", "hi", "hu", "he", "ho",
  "ma", "mi", "mu", "me", "mo", "ya", "yu", "yo", "ra", "ri", "ru", "re", "ro", "wa",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCached(url: string, cacheKey: string): Promise<string> {
  const cachePath = path.join(CACHE_DIR, cacheKey);
  try {
    return await readFile(cachePath, "utf-8");
  } catch {
    // cache miss
  }
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const html = await res.text();
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, html, "utf-8");
  await sleep(REQUEST_DELAY_MS);
  return html;
}

function stripInitial(name: string): string {
  return name.replace(/^[Ａ-Ｚ]．/, "");
}

function normalizeForMatch(name: string): string {
  if (name.includes("　")) return name;
  return stripInitial(name);
}

interface Bio {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  bats: string; // "右" | "左" | "両" | ""
}

function parseProfile(html: string): Bio | null {
  const $ = cheerio.load(html);
  let birthText = "";
  let batsText = "";
  $("#pc_bio th").each((_, el) => {
    const label = $(el).text().trim();
    const value = $(el).next("td").text().trim();
    if (label === "生年月日") birthText = value;
    if (label === "投打") batsText = value;
  });
  const m = birthText.match(/(\d+)年(\d+)月(\d+)日/);
  if (!m) return null;
  const batsMatch = batsText.match(/(右|左|両)打/);
  return {
    birthYear: Number(m[1]),
    birthMonth: Number(m[2]),
    birthDay: Number(m[3]),
    bats: batsMatch ? batsMatch[1] : "",
  };
}

/** 野球の一般的な年齢集計基準（その年の6/30時点の満年齢）で算出する */
function ageAsOf(year: number, birthYear: number, birthMonth: number, birthDay: number): number {
  const cutoff = new Date(year, 5, 30);
  const birth = new Date(birthYear, birthMonth - 1, birthDay);
  let age = year - birthYear;
  if (birth > cutoff) age -= 1;
  return age;
}

interface SearchCandidate {
  id: string;
  name: string;
}

function parseSearchResults(html: string): SearchCandidate[] {
  const $ = cheerio.load(html);
  const out: SearchCandidate[] = [];
  $("a.player_unit_1").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const idMatch = href.match(/players\/(\d+)\.html/);
    if (!idMatch) return;
    const name = $(el).find("dd.name").text().trim();
    out.push({ id: idMatch[1], name });
  });
  return out;
}

async function main() {
  const targetYears = process.argv.slice(2).map(Number).filter(Number.isInteger);
  if (targetYears.length === 0) {
    console.error("使い方: npx tsx scripts/build-player-bio.ts <year...>");
    process.exit(1);
  }

  console.log("[1/4] プロ野球在籍者名簿(50音順)を取得中...");
  const allEntries: RegistryEntry[] = [];
  for (const kana of KANA_LIST) {
    const html = await fetchCached(
      `https://npb.jp/history/register/index_${kana}.html`,
      `history-register-${kana}.html`
    );
    allEntries.push(...parseRegistryIndex(html));
  }
  console.log(`  登録選手数: ${allEntries.length}`);

  console.log("[2/4] 年度・球団別の解決テーブルを構築中...");
  const byMatchKey = new Map<string, RegistryEntry[]>();
  for (const e of allEntries) {
    const key = normalizeForMatch(e.name);
    const list = byMatchKey.get(key) ?? [];
    list.push(e);
    byMatchKey.set(key, list);
  }

  const resolutionByMatchKey = new Map<string, Map<string, string>>();
  const latestTeamFallback = new Map<string, { playerId: string; team: TeamId; maxYear: number }[]>();

  for (const [key, entries] of byMatchKey) {
    const lookup = new Map<string, string>();
    const fallbackList: { playerId: string; team: TeamId; maxYear: number }[] = [];
    for (const entry of entries) {
      let entryMaxYear = -1;
      let entryLatestTeam: TeamId | null = null;
      for (const { years, teamText } of parseYearsTeamText(entry.yearsText)) {
        const teamId = teamIdFromGameName(teamText);
        if (!teamId) continue;
        for (const year of years) {
          lookup.set(`${year}_${teamId}`, entry.playerId);
          if (year > entryMaxYear) {
            entryMaxYear = year;
            entryLatestTeam = teamId;
          }
        }
      }
      if (entryLatestTeam) {
        fallbackList.push({ playerId: entry.playerId, team: entryLatestTeam, maxYear: entryMaxYear });
      }
    }
    resolutionByMatchKey.set(key, lookup);
    latestTeamFallback.set(key, fallbackList);
  }

  const bioCache = new Map<string, Bio | null>(); // playerId -> bio

  async function getBio(playerId: string): Promise<Bio | null> {
    if (bioCache.has(playerId)) return bioCache.get(playerId)!;
    const html = await fetchCached(
      `https://npb.jp/bis/players/${playerId}.html`,
      `player-bio-${playerId}.html`
    );
    const bio = parseProfile(html);
    bioCache.set(playerId, bio);
    return bio;
  }

  let totalRows = 0;
  let resolvedByRegistry = 0;
  let resolvedBySearch = 0;
  let unresolved = 0;

  for (const year of targetYears) {
    const filePath = path.join(DATA_DIR, `${year}.json`);
    const yearData: YearData = JSON.parse(await readFile(filePath, "utf-8"));
    console.log(`\n[3/4] ${year}年 (${yearData.batters.length}行) を解決中...`);

    for (let i = 0; i < yearData.batters.length; i++) {
      const b = yearData.batters[i] as BatterRanking;
      totalRows++;
      const key = normalizeForMatch(b.name);

      let playerId = resolutionByMatchKey.get(key)?.get(`${b.year}_${b.teamId}`);
      if (playerId) resolvedByRegistry++;

      if (!playerId) {
        // 進行中シーズン等、名簿にまだ反映されていないケースのフォールバック
        const candidates = (latestTeamFallback.get(key) ?? []).filter(
          (c) => c.team === b.teamId && c.maxYear >= b.year - 2
        );
        if (candidates.length === 1) {
          playerId = candidates[0].playerId;
          resolvedByRegistry++;
        }
      }

      if (!playerId) {
        // 検索フォールバック（現役選手検索）。表示名がノイズマッチしないよう
        // 候補の表示名に検索語が部分文字列として含まれるものだけを採用する
        const keyword = b.name.replace(/\s+/g, "");
        const searchHtml = await fetchCached(
          `https://npb.jp/bis/players/search/result?search_keyword=${encodeURIComponent(keyword)}&active_flg=Y`,
          `search_active_${keyword}.html`
        );
        const candidates = parseSearchResults(searchHtml).filter((c) =>
          c.name.replace(/[\s　]/g, "").includes(keyword)
        );
        if (candidates.length === 1) {
          playerId = candidates[0].id;
          resolvedBySearch++;
        }
      }

      if (!playerId) {
        unresolved++;
        continue;
      }

      const bio = await getBio(playerId);
      if (!bio) {
        unresolved++;
        continue;
      }

      b.age = ageAsOf(b.year, bio.birthYear, bio.birthMonth, bio.birthDay);
      if (bio.bats) b.bats = bio.bats;

      if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${yearData.batters.length}`);
    }

    await writeFile(filePath, JSON.stringify(yearData, null, 0), "utf-8");
  }

  console.log(
    `\n[4/4] 完了。全${totalRows}行 / 名簿解決${resolvedByRegistry} / 検索解決${resolvedBySearch} / 未解決${unresolved}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
