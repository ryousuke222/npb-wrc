/**
 * 2005年より前の歴史データを構築するスクリプト（10年単位で実行する想定）。
 *
 * npb.jp公式サイトの試合単位データ（得点・失点・本拠地等）は2005年より前は存在しないため、
 * パークファクターは算出しない（PF=1固定）。また敬遠（IBB）の列も選手個人ページには
 * 存在しないため、常に0として扱う。これらは既知の制約としてabout等に明記する。
 *
 * データソース:
 * - プロ野球在籍者名簿（50音順、/history/register/index_*.html）で選手を発見
 * - 選手個人ページ（/bis/players/{id}.html）の年度別打撃成績を一次データとして使用
 * - 年度別成績ページ（/bis/yearly/{central,pacific}league_{year}.html）のチーム勝敗表から
 *   規定打席算出用の試合数を取得
 *
 * 実行: BUILD_START_YEAR=1995 BUILD_END_YEAR=2004 npx tsx scripts/build-historical-data.ts
 *
 * 注意: このスクリプトは対象年度の打者データを外国人選手名の頭文字disambiguation前の
 * 生の状態（姓のみ等）で書き出す。実行後は必ず
 * `npx tsx scripts/fix-ambiguous-batter-names.ts && npx tsx scripts/build-search-index.ts`
 * を実行して同姓の別人（例: Ｅ．ソト / Ｎ．ソト）の表記を復元すること。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  extractCandidateYears,
  parseHistoricalPlayerPage,
  parseRegistryIndex,
  parseYearlyTeamStandings,
  type HistoricalBattingRow,
} from "../lib/npbHistorical";
import { teamIdFromGameName, type TeamId } from "../lib/teams";
import { calcOps, calcWoba, calcWrcPlus } from "../lib/wrc";
import type { BatterRanking, LeagueKey, YearData } from "../lib/types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const DATA_DIR = path.join(process.cwd(), "data");
const REQUEST_DELAY_MS = 300;

const START_YEAR = Number(process.env.BUILD_START_YEAR ?? 1995);
const END_YEAR = Number(process.env.BUILD_END_YEAR ?? 2004);

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

const LEAGUE_BY_TEAM: Record<TeamId, LeagueKey> = {
  G: "central",
  T: "central",
  D: "central",
  S: "central",
  C: "central",
  YB: "central",
  H: "pacific",
  F: "pacific",
  L: "pacific",
  M: "pacific",
  Bs: "pacific",
  E: "pacific",
  Kn: "pacific",
  Da: "pacific",
};

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

const playerNameById = new Map<string, string>();

async function main() {
  console.log(`対象期間: ${START_YEAR}〜${END_YEAR}年`);

  console.log("[1/4] プロ野球在籍者名簿(50音順)を取得中...");
  const candidatePlayerIds = new Set<string>();
  for (const kana of KANA_LIST) {
    const html = await fetchCached(
      `https://npb.jp/history/register/index_${kana}.html`,
      `history-register-${kana}.html`
    );
    if (!html) continue;
    const entries = parseRegistryIndex(html);
    for (const entry of entries) {
      const years = extractCandidateYears(entry.yearsText);
      const overlaps = [...years].some((y) => y >= START_YEAR && y <= END_YEAR);
      if (overlaps) {
        candidatePlayerIds.add(entry.playerId);
        playerNameById.set(entry.playerId, entry.name);
      }
    }
  }
  console.log(`  候補選手数: ${candidatePlayerIds.size}`);

  console.log("[2/4] 各選手の個人ページを取得・パース中...");
  const battingByYear = new Map<number, HistoricalBattingRow[]>();
  const pitcherIds = new Set<string>();
  let fetched = 0;
  for (const playerId of candidatePlayerIds) {
    const html = await fetchCached(
      `https://npb.jp/bis/players/${playerId}.html`,
      `player-${playerId}.html`
    );
    if (!html) continue;
    const { battingRows, isPitcher } = parseHistoricalPlayerPage(html);
    if (isPitcher) pitcherIds.add(playerId);
    for (const row of battingRows) {
      if (row.year < START_YEAR || row.year > END_YEAR) continue;
      if (row.pa <= 0) continue;
      const list = battingByYear.get(row.year) ?? [];
      list.push({ ...row, playerId } as HistoricalBattingRow & { playerId: string });
      battingByYear.set(row.year, list);
    }
    fetched++;
    if (fetched % 200 === 0) console.log(`  ${fetched}/${candidatePlayerIds.size}人 完了`);
  }
  console.log(`  ${fetched}人分の個人ページを処理`);

  console.log("[3/4] 年度別成績ページからチーム試合数を取得中...");
  const teamGamesByYear = new Map<number, Map<TeamId, number>>();
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const teamGames = new Map<TeamId, number>();
    for (const lp of ["central", "pacific"] as const) {
      const html = await fetchCached(
        `https://npb.jp/bis/yearly/${lp}league_${year}.html`,
        `yearly-${lp}-${year}.html`
      );
      if (!html) continue;
      const standings = parseYearlyTeamStandings(html);
      for (const s of standings) {
        const teamId = teamIdFromGameName(s.teamName);
        if (teamId) teamGames.set(teamId, s.games);
      }
    }
    teamGamesByYear.set(year, teamGames);
  }

  console.log("[4/4] wRC+を算出しdata/{year}.jsonを書き出し中...");
  await mkdir(DATA_DIR, { recursive: true });

  const existingYears = new Set<number>();
  try {
    const raw = await readFile(path.join(DATA_DIR, "years.json"), "utf-8");
    for (const y of JSON.parse(raw) as number[]) existingYears.add(y);
  } catch {
    // 初回はファイルなし
  }
  const availableYears = new Set<number>(existingYears);

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const rows = (battingByYear.get(year) ?? []) as (HistoricalBattingRow & {
      playerId: string;
    })[];
    if (rows.length === 0) {
      console.log(`${year}: データなし、スキップ`);
      continue;
    }

    const teamGames = teamGamesByYear.get(year) ?? new Map<TeamId, number>();
    const regThresholdByTeam = new Map<TeamId, number>();
    for (const [teamId, games] of teamGames) {
      regThresholdByTeam.set(teamId, Math.round(games * 3.1));
    }
    const regThresholds = [...regThresholdByTeam.values()].sort((a, b) => a - b);
    const regulationPaThreshold =
      regThresholds.length > 0
        ? regThresholds[Math.floor(regThresholds.length / 2)]
        : 0;

    // リーグ平均（投手を除く）を算出
    const positionPlayerTotalsByLeague: Record<LeagueKey, HistoricalBattingRow> = {
      central: emptyStats(),
      pacific: emptyStats(),
    };
    for (const row of rows) {
      const teamId = teamIdFromGameName(row.teamName);
      if (!teamId) continue;
      if (pitcherIds.has(row.playerId)) continue;
      const league = LEAGUE_BY_TEAM[teamId];
      addStats(positionPlayerTotalsByLeague[league], row);
    }

    const lgWobaByLeague: Record<LeagueKey, number> = {
      central: calcWoba(positionPlayerTotalsByLeague.central),
      pacific: calcWoba(positionPlayerTotalsByLeague.pacific),
    };
    const lgRunsPerPaByLeague: Record<LeagueKey, number> = {
      central:
        positionPlayerTotalsByLeague.central.pa > 0
          ? positionPlayerTotalsByLeague.central.runs / positionPlayerTotalsByLeague.central.pa
          : 0,
      pacific:
        positionPlayerTotalsByLeague.pacific.pa > 0
          ? positionPlayerTotalsByLeague.pacific.runs / positionPlayerTotalsByLeague.pacific.pa
          : 0,
    };

    const allBatters: Omit<BatterRanking, "rank" | "leagueRank">[] = [];
    for (const row of rows) {
      const teamId = teamIdFromGameName(row.teamName);
      if (!teamId) continue;
      const league = LEAGUE_BY_TEAM[teamId];
      const lgWoba = lgWobaByLeague[league];
      const lgRunsPerPa = lgRunsPerPaByLeague[league];
      const woba = calcWoba(row);
      const wrcPlus = calcWrcPlus(row, lgWoba, lgRunsPerPa, 1, year);
      const avg = row.ab > 0 ? row.hits / row.ab : 0;
      const slg = row.ab > 0 ? row.totalBases / row.ab : 0;
      const obpDenom = row.ab + row.bb + row.hbp + row.sf;
      const obp = obpDenom > 0 ? (row.hits + row.bb + row.hbp) / obpDenom : 0;
      const regThreshold = regThresholdByTeam.get(teamId) ?? regulationPaThreshold;

      allBatters.push({
        name: playerNameById.get(row.playerId) ?? "",
        teamId,
        teamName: row.teamName,
        league,
        year,
        games: row.games,
        pa: row.pa,
        ab: row.ab,
        runs: row.runs,
        hits: row.hits,
        doubles: row.doubles,
        triples: row.triples,
        hr: row.hr,
        totalBases: row.totalBases,
        rbi: row.rbi,
        sb: row.sb,
        cs: row.cs,
        sh: row.sh,
        sf: row.sf,
        bb: row.bb,
        ibb: row.ibb,
        hbp: row.hbp,
        so: row.so,
        gdp: row.gdp,
        avg,
        slg,
        obp,
        woba,
        ops: calcOps(obp, slg),
        wrcPlus,
        parkFactor: null,
        qualified: row.pa >= regThreshold,
      });
    }

    allBatters.sort((a, b) => b.wrcPlus - a.wrcPlus);
    const leagueRankCounters: Record<LeagueKey, number> = { central: 0, pacific: 0 };
    const batters: BatterRanking[] = allBatters.map((b, i) => {
      let leagueRank: number | null = null;
      if (b.qualified) {
        leagueRankCounters[b.league] += 1;
        leagueRank = leagueRankCounters[b.league];
      }
      return { ...b, rank: i + 1, leagueRank };
    });

    const yearData: YearData = {
      year,
      generatedAt: new Date().toISOString(),
      seasonComplete: true,
      leagueContext: {
        central: {
          lgWoba: lgWobaByLeague.central,
          lgRunsPerPa: lgRunsPerPaByLeague.central,
          totals: positionPlayerTotalsByLeague.central,
        },
        pacific: {
          lgWoba: lgWobaByLeague.pacific,
          lgRunsPerPa: lgRunsPerPaByLeague.pacific,
          totals: positionPlayerTotalsByLeague.pacific,
        },
      },
      parkFactors: {},
      regulationPaThreshold,
      batters,
    };

    await writeFile(
      path.join(DATA_DIR, `${year}.json`),
      JSON.stringify(yearData, null, 0),
      "utf-8"
    );
    availableYears.add(year);
    const qualifiedCount = batters.filter((b) => b.qualified).length;
    console.log(
      `${year}: ok (${batters.length}選手, ${qualifiedCount}人規定到達, reg=${regulationPaThreshold}PA)`
    );
  }

  const sortedYears = [...availableYears].sort((a, b) => b - a);
  await writeFile(
    path.join(DATA_DIR, "years.json"),
    JSON.stringify(sortedYears, null, 2),
    "utf-8"
  );
  console.log(`完了。年度一覧: ${sortedYears.join(", ")}`);
}

function emptyStats(): HistoricalBattingRow {
  return {
    year: 0,
    teamName: "",
    games: 0,
    pa: 0,
    ab: 0,
    runs: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    totalBases: 0,
    rbi: 0,
    sb: 0,
    cs: 0,
    sh: 0,
    sf: 0,
    bb: 0,
    ibb: 0,
    hbp: 0,
    so: 0,
    gdp: 0,
  };
}

function addStats(a: HistoricalBattingRow, b: HistoricalBattingRow) {
  a.games += b.games;
  a.pa += b.pa;
  a.ab += b.ab;
  a.runs += b.runs;
  a.hits += b.hits;
  a.doubles += b.doubles;
  a.triples += b.triples;
  a.hr += b.hr;
  a.totalBases += b.totalBases;
  a.rbi += b.rbi;
  a.sb += b.sb;
  a.cs += b.cs;
  a.sh += b.sh;
  a.sf += b.sf;
  a.bb += b.bb;
  a.ibb += b.ibb;
  a.hbp += b.hbp;
  a.so += b.so;
  a.gdp += b.gdp;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
