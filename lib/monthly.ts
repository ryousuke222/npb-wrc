import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getLatestYear, getYearData } from "./data";
import type { BatterRanking, YearData } from "./types";
import type { TeamId } from "./teams";

export type MonthlyBatter = {
  batter: BatterRanking;
  pa: number;
  teamGames: number;
  requiredPa: number;
  avg: number;
  ops: number;
  hr: number;
  rbi: number;
};

export type CurrentMonthRanking = {
  year: number;
  month: number;
  label: string;
  central: MonthlyBatter[];
  pacific: MonthlyBatter[];
} | null;

type MonthlyRanking = Exclude<CurrentMonthRanking, null>;

function key(batter: BatterRanking) {
  return `${batter.nameKey ?? batter.name}|${batter.teamId}`;
}

function monthLabel(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(new Date(date));
}

function monthKey(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(date));
}

function monthNumber(date: string) {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", month: "2-digit" }).format(new Date(date))
  );
}

function teamGamesById(data: YearData): Map<TeamId, number> {
  if (data.teamGames && Object.keys(data.teamGames).length > 0) {
    return new Map(
      Object.entries(data.teamGames).map(([teamId, games]) => [teamId as TeamId, games ?? 0])
    );
  }

  // 過去のスナップショットには球団の消化試合数がないため、各球団で最も多く
  // 出場した打者の試合数を代用する。新しいスナップショットでは上の値を優先する。
  const result = new Map<TeamId, number>();
  for (const batter of data.batters) {
    result.set(batter.teamId, Math.max(result.get(batter.teamId) ?? 0, batter.games));
  }
  return result;
}

export async function getCurrentMonthRanking(): Promise<CurrentMonthRanking> {
  const year = await getLatestYear();
  const current = await getYearData(year);
  if (!current) return null;
  const directory = path.join(process.cwd(), "data", "snapshots", String(year));
  let snapshots: YearData[];
  try {
    const entries = await readdir(directory);
    snapshots = await Promise.all(entries.filter((entry) => entry.endsWith(".json")).map(async (entry) =>
      JSON.parse(await readFile(path.join(directory, entry), "utf-8")) as YearData
    ));
  } catch {
    return null;
  }
  const orderedSnapshots = snapshots.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());

  function rankPeriod(baseline: YearData, end: YearData): MonthlyRanking {
    const currentTeamGames = teamGamesById(end);
    const baselineTeamGames = teamGamesById(baseline);
    const old = new Map(baseline.batters.map((batter) => [key(batter), batter]));
    const rows = end.batters.flatMap((batter) => {
    const before = old.get(key(batter));
    if (!before) return [];
    const pa = batter.pa - before.pa;
    const ab = batter.ab - before.ab;
    const hits = batter.hits - before.hits;
    const bb = batter.bb - before.bb;
    const hbp = batter.hbp - before.hbp;
    const sf = batter.sf - before.sf;
    const totalBases = batter.totalBases - before.totalBases;
    const teamGames = Math.max(
      0,
      (currentTeamGames.get(batter.teamId) ?? 0) - (baselineTeamGames.get(batter.teamId) ?? 0)
    );
    const requiredPa = Math.ceil(teamGames * 3.1);
    if (teamGames === 0 || pa < requiredPa || ab <= 0) return [];
    const avg = hits / ab;
    const obpDenom = ab + bb + hbp + sf;
    const obp = obpDenom > 0 ? (hits + bb + hbp) / obpDenom : 0;
    return [{ batter, pa, teamGames, requiredPa, avg, ops: obp + totalBases / ab, hr: batter.hr - before.hr, rbi: batter.rbi - before.rbi }];
  });
    const rank = (league: "central" | "pacific") => rows
      .filter((row) => row.batter.league === league)
      .sort((a, b) => b.ops - a.ops || b.pa - a.pa)
      .slice(0, 10);
    return {
      year,
      month: monthNumber(end.generatedAt),
      label: `${monthLabel(baseline.generatedAt)} → ${monthLabel(end.generatedAt)}`,
      central: rank("central"),
      pacific: rank("pacific"),
    };
  }

  const currentKey = monthKey(current.generatedAt);
  const currentMonthSnapshots = orderedSnapshots.filter((snapshot) => monthKey(snapshot.generatedAt) === currentKey);
  const currentBaseline = currentMonthSnapshots[0];
  if (currentBaseline && new Date(currentBaseline.generatedAt).getTime() < new Date(current.generatedAt).getTime()) {
    const currentRanking = rankPeriod(currentBaseline, current);
    // 月初はまだ規定打席に届かず空になる。空の今月ではなく、直近で成立した月を出す。
    if (currentRanking.central.length > 0 || currentRanking.pacific.length > 0) return currentRanking;
  }

  const previousSnapshots = orderedSnapshots.filter((snapshot) => monthKey(snapshot.generatedAt) !== currentKey);
  if (previousSnapshots.length < 2) return null;
  const latestPreviousKey = monthKey(previousSnapshots.at(-1)!.generatedAt);
  const targetMonthSnapshots = previousSnapshots.filter((snapshot) => monthKey(snapshot.generatedAt) === latestPreviousKey);
  if (targetMonthSnapshots.length < 2) return null;
  return rankPeriod(targetMonthSnapshots[0], targetMonthSnapshots.at(-1)!);
}
