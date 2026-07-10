/**
 * 2005年より前の年度にパークファクターを追加するスクリプト。
 *
 * データソース: 2689web.com（個人運営、1936年〜の公式戦全試合ボックススコアを収録）。
 * npb.jp公式サイトには2005年より前の試合単位データ（得点・失点・本拠地等）が存在しないため。
 * 小規模サイトへの配慮として、控えめなアクセス間隔（600ms）で取得する。
 *
 * 打席単位PF（personalPF）は選手ごとの試合出場ログが必要だが、2689web.comのボックススコアには
 * チーム単位のスコアしかなく個人の出場記録がないため、2005年以降のような打席単位の適用はできない。
 * そのためチーム一律PF（(raw+1)/2の代わりに、5年窓＋信頼度回帰後のadjusted値をそのまま使用）を、
 * 既存のdata/{year}.jsonの該当年度・該当球団の全打者に一律適用し、wRC+を再計算する。
 *
 * 実行: BUILD_START_YEAR=1995 BUILD_END_YEAR=2004 npx tsx scripts/build-historical-parkfactor.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  parseGameScorePage,
  parseSeriesLinks,
  parseSeriesNav,
} from "../lib/npb2689";
import {
  aggregateTeamSplits,
  calcWeightedParkFactor,
  filterGamesForParkFactor,
  getPoolYears,
  type TeamSplit,
} from "../lib/parkFactor";
import type { GameResult } from "../lib/npbGames";
import {
  ALL_TEAM_IDS,
  HISTORICAL_ONLY_TEAM_IDS,
  teamIdFromGameName,
  type TeamId,
} from "../lib/teams";
import { calcWrcPlus } from "../lib/wrc";
import type { BatterRanking, LeagueKey, YearData } from "../lib/types";

// 近鉄バファローズ等、現在は消滅している歴史上のみの球団も対象に含める
const TARGET_TEAM_IDS: TeamId[] = [...ALL_TEAM_IDS, ...HISTORICAL_ONLY_TEAM_IDS];

const CACHE_DIR = path.join(process.cwd(), ".cache", "2689web");
const DATA_DIR = path.join(process.cwd(), "data");
const REQUEST_DELAY_MS = 600;
const SITE_ROOT = "http://2689web.com";
const MIN_YEAR = 1936;

const START_YEAR = Number(process.env.BUILD_START_YEAR ?? 1995);
const END_YEAR = Number(process.env.BUILD_END_YEAR ?? 2004);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const decoder = new TextDecoder("shift_jis");

const MAX_RETRIES = 4;

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
      // ネットワーク切断（GOAWAY等）は小規模サイト側の負荷対策の可能性もあるため、
      // 単純リトライではなく指数バックオフで間隔を大きく空けて再試行する
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

// 年度ごとの試合結果はウィンドウ計算で使い回すのでキャッシュする
const gameResultsCache = new Map<number, GameResult[]>();

async function fetchYearGameResults(year: number): Promise<GameResult[]> {
  if (year < MIN_YEAR) return [];
  const cached = gameResultsCache.get(year);
  if (cached) return cached;

  const yearHtml = await fetchCached(`${SITE_ROOT}/${year}.html`, `${year}.html`);
  if (!yearHtml) {
    gameResultsCache.set(year, []);
    return [];
  }

  const { central, pacific } = parseSeriesLinks(yearHtml);
  const allCodes = [...central, ...pacific];
  const results: GameResult[] = [];

  for (const code of allCodes) {
    const navHtml = await fetchCached(
      `${SITE_ROOT}/${year}/${code}/${code}.html`,
      `${year}-${code}-nav.html`
    );
    if (!navHtml) continue;
    const games = parseSeriesNav(navHtml);
    for (const g of games) {
      const gameHtml = await fetchCached(
        `${SITE_ROOT}/${year}/${code}/${g.gameFile}`,
        `${year}-${code}-${g.gameFile}`
      );
      if (!gameHtml) continue;
      const score = parseGameScorePage(gameHtml);
      if (!score) continue;
      const homeTeam = teamIdFromGameName(score.homeTeamName);
      const awayTeam = teamIdFromGameName(score.awayTeamName);
      if (!homeTeam || !awayTeam) continue;
      results.push({
        homeTeam,
        awayTeam,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        venue: score.venue,
        interleague: false, // 交流戦は2005年開始のため、それ以前は存在しない
      });
    }
  }

  gameResultsCache.set(year, results);
  return results;
}

async function main() {
  console.log(`対象期間: ${START_YEAR}〜${END_YEAR}年（パークファクター）`);

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    console.log(`\n=== ${year}年 ===`);

    const dataPath = path.join(DATA_DIR, `${year}.json`);
    let yearData: YearData;
    try {
      yearData = JSON.parse(await readFile(dataPath, "utf-8"));
    } catch {
      console.log(`  data/${year}.json が見つからないためスキップ`);
      continue;
    }

    const hasData = (y: number) => y >= MIN_YEAR && y <= END_YEAR + 4;

    const neededYears = new Set<number>();
    for (const team of TARGET_TEAM_IDS) {
      for (const { year: y } of getPoolYears(team, year, hasData)) {
        neededYears.add(y);
      }
    }

    const splitsByYear = new Map<number, Record<TeamId, TeamSplit>>();
    for (const y of neededYears) {
      const games = await fetchYearGameResults(y);
      const filtered = filterGamesForParkFactor(games);
      splitsByYear.set(y, aggregateTeamSplits(filtered));
      console.log(`  ${y}年: ${games.length}試合取得`);
    }

    const parkFactorByTeam: Partial<Record<TeamId, { adjusted: number; raw: number }>> = {};
    for (const team of TARGET_TEAM_IDS) {
      const teamSplitsByYear = new Map<number, TeamSplit>();
      for (const y of neededYears) {
        const s = splitsByYear.get(y)?.[team];
        if (s) teamSplitsByYear.set(y, s);
      }
      const pf = calcWeightedParkFactor(team, year, teamSplitsByYear, hasData);
      if (pf) parkFactorByTeam[team] = pf;
    }

    console.log(
      `  算出結果: ${TARGET_TEAM_IDS.filter((t) => parkFactorByTeam[t]).length}/${TARGET_TEAM_IDS.length}球団`
    );

    // data/{year}.json のparkFactors・各打者のparkFactor/wRC+を更新
    // （窓が前後年へ拡張されるため、対象年度にまだ存在しない球団（例: 2004年時点の楽天）の
    // 値が計算されてしまうことがある。その年度に実在する球団（batters中に存在）のみ反映する）
    const teamsInYear = new Set(yearData.batters.map((b) => b.teamId));
    const newParkFactors: YearData["parkFactors"] = {};
    for (const [teamId, pf] of Object.entries(parkFactorByTeam) as [
      TeamId,
      { adjusted: number; raw: number },
    ][]) {
      if (!teamsInYear.has(teamId)) continue;
      const existingTeamName = yearData.batters.find((b) => b.teamId === teamId)?.teamName;
      newParkFactors[teamId] = {
        teamName: existingTeamName ?? teamId,
        raw: pf.raw,
        adjusted: pf.adjusted,
        homeGames: 0,
        awayGames: 0,
        sampleYears: 0,
        confidence: 0,
      };
    }
    yearData.parkFactors = newParkFactors;

    // rank/leagueRankはこの後のソート・再採番で上書きするため、ここでは古い値のまま残しておく
    const updatedBatters: BatterRanking[] = yearData.batters.map((b) => {
      const pf = parkFactorByTeam[b.teamId];
      const parkFactor = pf ? pf.adjusted : null;
      const lg = yearData.leagueContext[b.league as LeagueKey];
      const wrcPlus = calcWrcPlus(b, lg.lgWoba, lg.lgRunsPerPa, parkFactor ?? 1);
      return { ...b, parkFactor, wrcPlus };
    });

    updatedBatters.sort((a, b) => b.wrcPlus - a.wrcPlus);
    const leagueRankCounters: Record<LeagueKey, number> = { central: 0, pacific: 0 };
    yearData.batters = updatedBatters.map((b, i) => {
      let leagueRank: number | null = null;
      if (b.qualified) {
        leagueRankCounters[b.league] += 1;
        leagueRank = leagueRankCounters[b.league];
      }
      return { ...b, rank: i + 1, leagueRank };
    });

    await writeFile(dataPath, JSON.stringify(yearData, null, 0), "utf-8");
    console.log(`  data/${year}.json 更新完了`);
  }

  console.log("\n完了。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
