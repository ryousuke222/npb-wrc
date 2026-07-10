import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BatterRanking, TeamParkFactorInfo, YearData } from "./types";
import type { TeamId } from "./teams";

const DATA_DIR = path.join(process.cwd(), "data");

let yearsCache: number[] | null = null;
const yearDataCache = new Map<number, YearData | null>();

export async function getAvailableYears(): Promise<number[]> {
  if (yearsCache) return yearsCache;
  const raw = await readFile(path.join(DATA_DIR, "years.json"), "utf-8");
  yearsCache = JSON.parse(raw) as number[];
  return yearsCache;
}

export async function getYearData(year: number): Promise<YearData | null> {
  if (yearDataCache.has(year)) return yearDataCache.get(year)!;
  try {
    const raw = await readFile(path.join(DATA_DIR, `${year}.json`), "utf-8");
    const data = JSON.parse(raw) as YearData;
    yearDataCache.set(year, data);
    return data;
  } catch {
    yearDataCache.set(year, null);
    return null;
  }
}

export async function getLatestYear(): Promise<number> {
  const years = await getAvailableYears();
  return years[0];
}

/** 全年度・全打者を一度だけ読み込んで使い回すキャッシュ */
let allBattersPromise: Promise<BatterRanking[]> | null = null;

export async function getAllBatters(): Promise<BatterRanking[]> {
  if (!allBattersPromise) {
    allBattersPromise = (async () => {
      const years = await getAvailableYears();
      const allData = await Promise.all(years.map((y) => getYearData(y)));
      const batters: BatterRanking[] = [];
      for (const data of allData) {
        if (!data) continue;
        batters.push(...data.batters);
      }
      return batters;
    })();
  }
  return allBattersPromise;
}

export interface ParkFactorMatrixEntry extends TeamParkFactorInfo {
  year: number;
  teamId: TeamId;
}

/** 全年度分のパークファクターを年度昇順で返す（診断用の一覧ページで使用） */
export async function getAllParkFactors(): Promise<ParkFactorMatrixEntry[]> {
  const years = await getAvailableYears();
  const allData = await Promise.all(years.map((y) => getYearData(y)));
  const entries: ParkFactorMatrixEntry[] = [];
  for (const data of allData) {
    if (!data) continue;
    for (const [teamId, pf] of Object.entries(data.parkFactors)) {
      entries.push({ year: data.year, teamId: teamId as TeamId, ...pf });
    }
  }
  entries.sort((a, b) => a.year - b.year);
  return entries;
}

/** 選手名をキーにした全打者エントリの索引。初回アクセス時に一度だけ構築する */
let nameIndexPromise: Promise<Map<string, BatterRanking[]>> | null = null;

async function getNameIndex(): Promise<Map<string, BatterRanking[]>> {
  if (!nameIndexPromise) {
    nameIndexPromise = (async () => {
      const all = await getAllBatters();
      const index = new Map<string, BatterRanking[]>();
      for (const b of all) {
        const list = index.get(b.name);
        if (list) list.push(b);
        else index.set(b.name, [b]);
      }
      return index;
    })();
  }
  return nameIndexPromise;
}

/**
 * 同姓同名の選手名で全年度分のデータを横断検索する（簡易的な名前一致判定）。
 * 複数球団に在籍したシーズン（トレード等）はそれぞれ別エントリとして返る。
 */
export async function getPlayerHistory(
  name: string
): Promise<BatterRanking[]> {
  const index = await getNameIndex();
  const history = [...(index.get(name) ?? [])];
  history.sort((a, b) => a.year - b.year || a.teamId.localeCompare(b.teamId));
  return history;
}
