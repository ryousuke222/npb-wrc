import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  parsePitcherNames,
  parseTeamBattingRows,
  parseTeamRosterPage,
  sumTeamBattingRows,
  toBatterRow,
} from "../lib/npbParse";
import {
  parseGameDates,
  parseGameDayResults,
  type GameResult,
} from "../lib/npbGames";
import {
  aggregateTeamSplits,
  calcWeightedParkFactor,
  filterGamesForParkFactor,
  getPoolYears,
  getPrimaryVenuesByTeam,
  type ParkFactor,
  type TeamSplit,
} from "../lib/parkFactor";
import { parseGameLog, parseGameLogRefs } from "../lib/npbGameLog";
import { ALL_TEAM_IDS, teamIdFromGameName, type TeamId } from "../lib/teams";
import { calcOps, calcWoba, calcWrcPlus } from "../lib/wrc";
import type {
  BatterRanking,
  CountingStats,
  LeagueKey,
  TeamParkFactorInfo,
  YearData,
} from "../lib/types";

function emptyCountingStats(): CountingStats {
  return {
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

function addCountingStats(a: CountingStats, b: CountingStats) {
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

const START_YEAR = 2005;
const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const DATA_DIR = path.join(process.cwd(), "data");
const REQUEST_DELAY_MS = 200;
// シーズン進行中の年度の集計ページ（チーム打撃成績・個人打撃成績・投手一覧）は
// 試合のたびに更新されるため、無期限キャッシュにせず短いTTLで再取得を強制する。
const CURRENT_YEAR_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6時間
const SEASON_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

const LEAGUE_PATH: Record<LeagueKey, "c" | "p"> = {
  central: "c",
  pacific: "p",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param maxAgeMs 指定した場合、キャッシュがこの期間より古ければ無視して再取得する。
 *   シーズン進行中の年度の「チーム打撃成績」「個人打撃成績」ページは日々更新されるため、
 *   過去の完了済み年度（無期限キャッシュ）と違い短いTTLを指定する必要がある。
 */
async function fetchCached(
  url: string,
  cacheKey: string,
  maxAgeMs?: number
): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, cacheKey);
  try {
    if (maxAgeMs !== undefined) {
      const stats = await stat(cachePath);
      if (Date.now() - stats.mtimeMs > maxAgeMs) throw new Error("stale");
    }
    return await readFile(cachePath, "utf-8");
  } catch {
    // キャッシュなし、または期限切れ。取得する
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

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * 月別カレンダー（/calendar/index_MM.html）で試合日を洗い出す。
 * シーズン進行中の年度ではこのアーカイブページ自体がまだ生成されておらず
 * 404になることがあるため、その場合は3月1日〜今日（または11月30日）を
 * 1日ずつ総当たりするフォールバックを使う。
 */
async function fetchYearGameDates(year: number): Promise<string[]> {
  if (year < START_YEAR || year > new Date().getFullYear()) return [];

  const dateSet = new Set<string>();

  for (const month of SEASON_MONTHS) {
    const mm = String(month).padStart(2, "0");
    const html = await fetchCached(
      `https://npb.jp/bis/${year}/calendar/index_${mm}.html`,
      `${year}-cal-${mm}.html`
    );
    if (!html) continue;
    for (const d of parseGameDates(html)) dateSet.add(d);
  }

  if (dateSet.size === 0) {
    const today = new Date();
    const rangeEnd =
      year < today.getFullYear()
        ? new Date(year, 10, 30)
        : new Date(Math.min(today.getTime(), new Date(year, 10, 30).getTime()));
    for (
      let d = new Date(year, 2, 1);
      d <= rangeEnd;
      d.setDate(d.getDate() + 1)
    ) {
      dateSet.add(formatDate(d));
    }
  }

  return [...dateSet];
}

async function fetchYearGameResults(year: number) {
  const dates = await fetchYearGameDates(year);
  const results = [];
  for (const date of dates) {
    const html = await fetchCached(
      `https://npb.jp/bis/${year}/games/gm${date}.html`,
      `${year}-gm-${date}.html`
    );
    if (!html) continue;
    results.push(...parseGameDayResults(html));
  }
  return results;
}

/**
 * 選手ごとに、その年実際に対戦した球場のraw PFを打席数で加重平均した
 * 「個人の実効PF」を算出する（NPB版wRC+仕様3.9: 打席単位でのPF適用）。
 *
 * チーム一律の「(raw+1)/2」という近似は「ロード時の対戦環境は常にリーグ平均(1.0)」と
 * 仮定しているが、実際にはロード対戦相手は主に自リーグの他5球団であり、
 * 自チームの本拠地（＝自分のロード平均には含まれない）が極端な値ほど
 * 「他5球団平均」もリーグ平均からズレる。この構造的なズレを補正するため、
 * 選手が実際に出場した試合ごとの球場のPFを打席数で加重平均する。
 *
 * ロースターページの選手名は「姓　名」（フルネーム、全角スペース区切り）だが、
 * 試合ログ側の表示名は姓のみ（同姓の選手がチーム内にいる場合のみ姓+名の一部で
 * 曖昧さ回避、例:「清宮幸」）という短縮形式のため、そのままでは一致しない。
 * そのため戻り値は `チームID -> (試合ログ側の短縮名 -> 実効PF)` とし、
 * 呼び出し側でロースター名（スペース除去）が試合ログ側の短縮名を前方一致で
 * 含むかどうかで解決する（複数候補がある場合は最長一致を採用）。
 */
async function computePersonalParkFactors(
  year: number,
  rawPfByTeam: Map<TeamId, number>
): Promise<Map<TeamId, Map<string, number>>> {
  const dates = await fetchYearGameDates(year);
  const yearGames: GameResult[] = [];
  const gmHtmlByDate = new Map<string, string>();
  for (const date of dates) {
    const html = await fetchCached(
      `https://npb.jp/bis/${year}/games/gm${date}.html`,
      `${year}-gm-${date}.html`
    );
    if (!html) continue;
    gmHtmlByDate.set(date, html);
    yearGames.push(...parseGameDayResults(html));
  }
  const primaryVenuesByTeam = getPrimaryVenuesByTeam(yearGames);

  // キーは `${teamId}|${選手名}`
  const agg = new Map<string, { sumPfWeighted: number; totalPa: number }>();

  for (const [, html] of gmHtmlByDate) {
    const refs = parseGameLogRefs(html);
    for (const ref of refs) {
      const url =
        ref.kind === "legacy"
          ? `https://npb.jp/bis/${year}/games/${ref.href}`
          : `https://npb.jp${ref.href}box.html`;
      const cacheKey =
        ref.kind === "legacy"
          ? `${year}-legacy-${ref.href}`
          : `${year}-newbox-${ref.href.replace(/\//g, "_")}box.html`;
      const gameHtml = await fetchCached(url, cacheKey);
      if (!gameHtml) continue;
      const summary = parseGameLog(gameHtml, ref.kind);
      if (!summary) continue;

      const homeTeamId = teamIdFromGameName(summary.homeTeamName);
      const awayTeamId = teamIdFromGameName(summary.awayTeamName);
      const isPrimary = homeTeamId
        ? (primaryVenuesByTeam.get(homeTeamId)?.has(summary.venue) ?? false)
        : false;
      const venuePF =
        isPrimary && homeTeamId ? (rawPfByTeam.get(homeTeamId) ?? 1) : 1;

      for (const [lines, teamId] of [
        [summary.away, awayTeamId],
        [summary.home, homeTeamId],
      ] as const) {
        for (const line of lines) {
          if (line.pa === 0 || !teamId) continue;
          const key = `${teamId}|${line.playerName}`;
          const a = agg.get(key) ?? { sumPfWeighted: 0, totalPa: 0 };
          a.sumPfWeighted += venuePF * line.pa;
          a.totalPa += line.pa;
          agg.set(key, a);
        }
      }
    }
  }

  const result = new Map<TeamId, Map<string, number>>();
  for (const [key, a] of agg) {
    if (a.totalPa === 0) continue;
    const [teamId, playerName] = key.split("|") as [TeamId, string];
    const byName = result.get(teamId) ?? new Map<string, number>();
    byName.set(playerName, (a.sumPfWeighted / a.totalPa + 1) / 2);
    result.set(teamId, byName);
  }
  return result;
}

/**
 * ロースターのフルネーム（姓　名、全角スペース区切り）に対応する、試合ログ側の
 * 短縮名エントリを解決する。「姓」または「姓+曖昧さ回避の一部」がフルネームの
 * 前方一致になっているキーを探し、複数候補があれば最長一致（＝より具体的な
 * 曖昧さ回避形）を採用する。
 */
function resolvePersonalPf(
  byName: Map<string, number> | undefined,
  fullName: string
): number | undefined {
  if (!byName) return undefined;
  const normalized = fullName.replace(/[\s　]/g, "");
  let best: { key: string; pf: number } | null = null;
  for (const [key, pf] of byName) {
    if (normalized.startsWith(key) && (!best || key.length > best.key.length)) {
      best = { key, pf };
    }
  }
  return best?.pf;
}

// 年度ごとの試合結果は複数年のパークファクター算出で使い回すのでキャッシュする
const gameResultsCache = new Map<
  number,
  Awaited<ReturnType<typeof fetchYearGameResults>>
>();

async function getYearGameResultsCached(year: number) {
  const cached = gameResultsCache.get(year);
  if (cached) return cached;
  const results = await fetchYearGameResults(year);
  gameResultsCache.set(year, results);
  return results;
}

/**
 * パークファクターは単年（1球団あたり本拠地・ビジター各70試合強）だけでは
 * サンプルが少なくブレが大きいため、球団ごとに複数年を加重プールして算出する。
 * - 本拠地移転・球場改修等があった球団（PARK_RENOVATION_YEARS）は、変化年を
 *   起点とする前方窓（未来方向のみ、最大5年、重み5,4,3,2,1）を使う。
 * - それ以外の球団は対象年度を中心とした最大5年窓（近い順に重み5,4,4,3,3）を使う。
 * さらにサンプル年数に応じた信頼度で1.0側へ回帰させる（getPoolYears/calcWeightedParkFactor参照）。
 * 交流戦・地方球場の除外は、本拠地球場が年度によって変わりうる（移転等）ため
 * プールする前に年度ごとに行う。
 */
async function computeWeightedParkFactors(
  year: number
): Promise<Partial<Record<TeamId, ParkFactor>>> {
  const currentYear = new Date().getFullYear();
  const hasData = (y: number) => y >= START_YEAR && y <= currentYear;

  const neededYears = new Set<number>();
  for (const team of ALL_TEAM_IDS) {
    for (const { year: y } of getPoolYears(team, year, hasData)) {
      neededYears.add(y);
    }
  }

  const splitsByYear = new Map<number, Record<TeamId, TeamSplit>>();
  for (const y of neededYears) {
    const yearGames = await getYearGameResultsCached(y);
    const filtered = filterGamesForParkFactor(yearGames);
    splitsByYear.set(y, aggregateTeamSplits(filtered));
  }

  const result: Partial<Record<TeamId, ParkFactor>> = {};
  for (const team of ALL_TEAM_IDS) {
    const teamSplitsByYear = new Map<number, TeamSplit>();
    for (const y of neededYears) {
      const s = splitsByYear.get(y)?.[team];
      if (s) teamSplitsByYear.set(y, s);
    }
    const pf = calcWeightedParkFactor(team, year, teamSplitsByYear, hasData);
    if (pf) result[team] = pf;
  }
  return result;
}

async function buildYear(year: number): Promise<YearData | null> {
  const leagues: LeagueKey[] = ["central", "pacific"];
  const leagueContext: YearData["leagueContext"] = {
    central: { lgWoba: 0, lgRunsPerPa: 0, totals: sumTeamBattingRows([]) },
    pacific: { lgWoba: 0, lgRunsPerPa: 0, totals: sumTeamBattingRows([]) },
  };
  const allBatters: Omit<BatterRanking, "rank" | "leagueRank">[] = [];
  const parkFactors: Record<string, TeamParkFactorInfo> = {};
  const regThresholds: number[] = [];
  let anyData = false;

  // パークファクターの算出（球団ごとに複数年を加重プール＋信頼度回帰、詳細はcomputeWeightedParkFactors参照）
  const parkFactorByTeam = await computeWeightedParkFactors(year);

  // 選手ごとの実効PF（打席単位でのPF適用）。チーム一律PFのraw値を、その選手が
  // 実際にその年出場した試合の球場ごとに打席数で加重平均したもの。
  const rawPfByTeam = new Map<TeamId, number>();
  for (const [teamId, pf] of Object.entries(parkFactorByTeam) as [
    TeamId,
    (typeof parkFactorByTeam)[TeamId],
  ][]) {
    if (pf) rawPfByTeam.set(teamId, pf.raw);
  }
  const personalPfMap = await computePersonalParkFactors(year, rawPfByTeam);

  const isCurrentYear = year === new Date().getFullYear();
  const statsMaxAgeMs = isCurrentYear ? CURRENT_YEAR_CACHE_MAX_AGE_MS : undefined;

  for (const league of leagues) {
    const lp = LEAGUE_PATH[league];
    const base = `https://npb.jp/bis/${year}/stats`;

    const tmbHtml = await fetchCached(
      `${base}/tmb_${lp}.html`,
      `${year}-tmb-${lp}.html`,
      statsMaxAgeMs
    );
    if (!tmbHtml) {
      console.warn(`[skip] ${year} ${league}: tmb fetch failed`);
      continue;
    }

    const teamRows = parseTeamBattingRows(tmbHtml);
    if (teamRows.length === 0) continue;
    anyData = true;

    // 1巡目: 全球団のロースター・投手名一覧を取得し、投手を除いたリーグ全体の
    // 打撃成績を積み上げる（セ・リーグはDH制がなく投手も打席に立つため、
    // 投手の打席を含めるとリーグ平均が実態より低く出てしまう。wRC+の分母には
    // 投手を除いたリーグ平均を用いる）。
    const positionPlayerTotals = emptyCountingStats();
    const teamRosterRows: {
      team: (typeof teamRows)[number];
      rawRows: ReturnType<typeof parseTeamRosterPage>;
      regThreshold: number;
    }[] = [];

    for (const team of teamRows) {
      const regThreshold = Math.round(team.games * 3.1);
      if (team.games > 0) regThresholds.push(regThreshold);

      const rosterHtml = await fetchCached(
        `${base}/idb1_${team.code}.html`,
        `${year}-idb1-${team.code}.html`,
        statsMaxAgeMs
      );
      if (!rosterHtml) {
        console.warn(`[skip] ${year} ${team.teamId}: roster fetch failed`);
        continue;
      }
      const rawRows = parseTeamRosterPage(rosterHtml);
      teamRosterRows.push({ team, rawRows, regThreshold });

      const pitcherHtml = await fetchCached(
        `${base}/idp1_${team.code}.html`,
        `${year}-idp1-${team.code}.html`,
        statsMaxAgeMs
      );
      const pitcherNames = pitcherHtml ? parsePitcherNames(pitcherHtml) : new Set<string>();

      for (const raw of rawRows) {
        if (!pitcherNames.has(raw.name)) addCountingStats(positionPlayerTotals, raw);
      }
    }

    const lgWoba = calcWoba(positionPlayerTotals);
    const lgRunsPerPa = positionPlayerTotals.runs / positionPlayerTotals.pa;
    leagueContext[league] = { lgWoba, lgRunsPerPa, totals: positionPlayerTotals };

    // 2巡目: 投手を除いたリーグ平均を使って各選手のwRC+を算出する
    // （選手自身が投手であっても、代打成績等の表示は従来通り行う）
    for (const { team, rawRows, regThreshold } of teamRosterRows) {
      const pf = parkFactorByTeam[team.teamId];
      const parkFactor = pf ? pf.adjusted : null;
      if (pf && !parkFactors[team.teamId]) {
        parkFactors[team.teamId] = {
          teamName: team.teamName,
          raw: pf.raw,
          adjusted: pf.adjusted,
          homeGames: pf.homeGames,
          awayGames: pf.awayGames,
          sampleYears: pf.sampleYears,
          confidence: pf.confidence,
        };
      }

      for (const raw of rawRows) {
        const row = toBatterRow(raw, team, league);
        const woba = calcWoba(row);
        // 打席単位の実効PFが取得できていればそちらを優先し、
        // 取れなかった選手（試合ログ側の名前不一致等）はチーム一律PFにフォールバックする
        const personalPf = resolvePersonalPf(
          personalPfMap.get(team.teamId),
          raw.name
        );
        const effectiveParkFactor = personalPf ?? parkFactor;
        const wrcPlus = calcWrcPlus(
          row,
          lgWoba,
          lgRunsPerPa,
          effectiveParkFactor ?? 1,
          year
        );
        allBatters.push({
          ...row,
          year,
          woba,
          ops: calcOps(row.obp, row.slg),
          wrcPlus,
          parkFactor: effectiveParkFactor,
          qualified: raw.pa >= regThreshold,
        });
      }
    }
  }

  if (!anyData) return null;

  allBatters.sort((a, b) => b.wrcPlus - a.wrcPlus);
  const leagueRankCounters: Record<LeagueKey, number> = {
    central: 0,
    pacific: 0,
  };
  const batters: BatterRanking[] = allBatters.map((b, i) => {
    let leagueRank: number | null = null;
    if (b.qualified) {
      leagueRankCounters[b.league] += 1;
      leagueRank = leagueRankCounters[b.league];
    }
    return { ...b, rank: i + 1, leagueRank };
  });

  const currentYear = new Date().getFullYear();
  const seasonComplete = year < currentYear;

  regThresholds.sort((a, b) => a - b);
  const regulationPaThreshold =
    regThresholds.length > 0
      ? regThresholds[Math.floor(regThresholds.length / 2)]
      : 0;

  return {
    year,
    generatedAt: new Date().toISOString(),
    seasonComplete,
    leagueContext,
    parkFactors,
    regulationPaThreshold,
    batters,
  };
}

async function main() {
  const currentYear = new Date().getFullYear();
  const onlyYear = process.env.BUILD_YEAR
    ? Number(process.env.BUILD_YEAR)
    : null;
  const years: number[] = onlyYear
    ? [onlyYear]
    : Array.from(
        { length: currentYear - START_YEAR + 1 },
        (_, i) => START_YEAR + i
      );

  await mkdir(DATA_DIR, { recursive: true });

  // 既存のyears.json（部分再生成時に他の年度のエントリを消さないよう引き継ぐ）
  const existingYears = new Set<number>();
  try {
    const raw = await readFile(path.join(DATA_DIR, "years.json"), "utf-8");
    for (const y of JSON.parse(raw) as number[]) existingYears.add(y);
  } catch {
    // 初回生成時はファイルがない
  }

  const availableYears = new Set<number>(existingYears);

  for (const year of years) {
    process.stdout.write(`processing ${year}... `);
    const data = await buildYear(year);
    if (!data) {
      console.log("no data, skip");
      continue;
    }
    await writeFile(
      path.join(DATA_DIR, `${year}.json`),
      JSON.stringify(data, null, 0),
      "utf-8"
    );
    availableYears.add(year);
    const qualifiedCount = data.batters.filter((b) => b.qualified).length;
    console.log(
      `ok (${data.batters.length} batters, ${qualifiedCount} qualified, reg=${data.regulationPaThreshold}PA)`
    );
  }

  const sortedYears = [...availableYears].sort((a, b) => b - a);
  await writeFile(
    path.join(DATA_DIR, "years.json"),
    JSON.stringify(sortedYears, null, 2),
    "utf-8"
  );
  console.log(`done. years: ${sortedYears.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
