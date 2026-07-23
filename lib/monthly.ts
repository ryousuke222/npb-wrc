import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getLatestYear, getYearData } from "./data";
import type { BatterRanking, YearData } from "./types";

export type MonthlyBatter = {
  batter: BatterRanking;
  pa: number;
  avg: number;
  ops: number;
  hr: number;
  rbi: number;
};

export type CurrentMonthRanking = {
  year: number;
  month: number;
  label: string;
  minPa: number;
  central: MonthlyBatter[];
  pacific: MonthlyBatter[];
} | null;

function key(batter: BatterRanking) {
  return `${batter.nameKey ?? batter.name}|${batter.teamId}`;
}

function monthLabel(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(new Date(date));
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
  const currentMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", month: "2-digit" }).format(new Date(current.generatedAt));
  const month = Number(currentMonth);
  const baseline = snapshots
    .filter((snapshot) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", month: "2-digit" }).format(new Date(snapshot.generatedAt)) === currentMonth)
    .sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime())[0];
  if (!baseline || new Date(baseline.generatedAt).getTime() >= new Date(current.generatedAt).getTime()) return null;

  // 月初からまだ日が浅い、またはリーグ間で試合数に差がある期間でも空のランキングに
  // ならないよう、経過日数に応じて最低打席数を10〜20打席の範囲で調整する。
  const elapsedDays = Math.max(1, Math.ceil((new Date(current.generatedAt).getTime() - new Date(baseline.generatedAt).getTime()) / 86_400_000));
  const minPa = Math.min(20, Math.max(10, elapsedDays * 3));

  const old = new Map(baseline.batters.map((batter) => [key(batter), batter]));
  const rows = current.batters.flatMap((batter) => {
    const before = old.get(key(batter));
    if (!before) return [];
    const pa = batter.pa - before.pa;
    const ab = batter.ab - before.ab;
    const hits = batter.hits - before.hits;
    const bb = batter.bb - before.bb;
    const hbp = batter.hbp - before.hbp;
    const sf = batter.sf - before.sf;
    const totalBases = batter.totalBases - before.totalBases;
    if (pa < minPa || ab <= 0) return [];
    const avg = hits / ab;
    const obpDenom = ab + bb + hbp + sf;
    const obp = obpDenom > 0 ? (hits + bb + hbp) / obpDenom : 0;
    return [{ batter, pa, avg, ops: obp + totalBases / ab, hr: batter.hr - before.hr, rbi: batter.rbi - before.rbi }];
  });
  const rank = (league: "central" | "pacific") => rows
    .filter((row) => row.batter.league === league)
    .sort((a, b) => b.ops - a.ops || b.pa - a.pa)
    .slice(0, 10);
  return { year, month, label: `${monthLabel(baseline.generatedAt)} → ${monthLabel(current.generatedAt)}`, minPa, central: rank("central"), pacific: rank("pacific") };
}
