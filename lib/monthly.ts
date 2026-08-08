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

export type MonthlyPeriod = {
  key: string;
  year: number;
  month: number;
  label: string;
};

export type MonthlyRanking = {
  period: MonthlyPeriod;
  label: string | null;
  coverageNote: string | null;
  qualifiedCounts: Record<"central" | "pacific", number>;
  central: MonthlyBatter[];
  pacific: MonthlyBatter[];
  availablePeriods: MonthlyPeriod[];
};

function key(batter: BatterRanking) {
  // 既存スナップショットにはnameKeyがないものがあるため、日次差分は
  // 登録名＋球団で安定して照合する。
  return `${batter.name.normalize("NFKC").replace(/[\s　]/g, "")}|${batter.teamId}`;
}

function monthLabel(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(new Date(date));
}

function datePartsInJapan(date: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function periodFromDate(date: string): MonthlyPeriod {
  const { year, month } = datePartsInJapan(date);
  return { key: `${year}-${String(month).padStart(2, "0")}`, year, month, label: `${year}年${month}月` };
}

function teamGamesById(data: YearData): Map<TeamId, number> {
  if (data.teamGames && Object.keys(data.teamGames).length > 0) {
    return new Map(Object.entries(data.teamGames).map(([teamId, games]) => [teamId as TeamId, games ?? 0]));
  }
  const result = new Map<TeamId, number>();
  for (const batter of data.batters) result.set(batter.teamId, Math.max(result.get(batter.teamId) ?? 0, batter.games));
  return result;
}

function rankPeriod(period: MonthlyPeriod, baseline: YearData, end: YearData, availablePeriods: MonthlyPeriod[]): MonthlyRanking {
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
    const teamGames = Math.max(0, (currentTeamGames.get(batter.teamId) ?? 0) - (baselineTeamGames.get(batter.teamId) ?? 0));
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
    period,
    label: `${monthLabel(baseline.generatedAt)} → ${monthLabel(end.generatedAt)}`,
    coverageNote: `${monthLabel(baseline.generatedAt)}の保存値`,
    qualifiedCounts: {
      central: rows.filter((row) => row.batter.league === "central").length,
      pacific: rows.filter((row) => row.batter.league === "pacific").length,
    },
    central: rank("central"),
    pacific: rank("pacific"),
    availablePeriods,
  };
}

/** 保存済みの月を選べる月間OPSランキング。月初は現在月を維持し、空なら更新待ちとして返す。 */
export async function getMonthlyRanking(selectedKey?: string): Promise<MonthlyRanking | null> {
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
    snapshots = [];
  }

  const currentPeriod = periodFromDate(current.generatedAt);
  const grouped = new Map<string, YearData[]>();
  for (const snapshot of snapshots) {
    const period = periodFromDate(snapshot.generatedAt);
    const group = grouped.get(period.key) ?? [];
    group.push(snapshot);
    grouped.set(period.key, group);
  }
  // 月初からの差分を作れる月だけを過去月の選択肢に出す。
  // 2026年7月のように月途中からしか保存値がない月は、月間成績として誤解を招くため除外する。
  const completePeriodKeys = [...grouped.entries()]
    .filter(([, periodSnapshots]) =>
      periodSnapshots.some((snapshot) => datePartsInJapan(snapshot.generatedAt).day === 1)
    )
    .map(([periodKey]) => periodKey);
  const availablePeriods = [...new Map(
    [...completePeriodKeys, currentPeriod.key].map((periodKey) => {
      const snapshot = grouped.get(periodKey)?.[0];
      const period = snapshot ? periodFromDate(snapshot.generatedAt) : currentPeriod;
      return [period.key, period] as const;
    })
  ).values()].sort((a, b) => b.key.localeCompare(a.key));
  const period = availablePeriods.find((candidate) => candidate.key === selectedKey) ?? currentPeriod;
  const periodSnapshots = (grouped.get(period.key) ?? []).sort(
    (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
  );
  const end = period.key === currentPeriod.key ? current : periodSnapshots.at(-1);
  // その月の1日に保存した累計値を差し引く。これにより前月最終日の試合を混ぜず、
  // かつ月初の試合前に保存された値から当月分だけを集計できる。
  const baseline = periodSnapshots.find(
    (snapshot) => datePartsInJapan(snapshot.generatedAt).day === 1
  );
  if (!baseline || !end || new Date(baseline.generatedAt).getTime() >= new Date(end.generatedAt).getTime()) {
    return {
      period,
      label: null,
      coverageNote: null,
      qualifiedCounts: { central: 0, pacific: 0 },
      central: [],
      pacific: [],
      availablePeriods,
    };
  }
  return rankPeriod(period, baseline, end, availablePeriods);
}
