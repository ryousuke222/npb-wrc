import { readFile } from "node:fs/promises";
import path from "node:path";
import type { BatterRanking, TeamParkFactorInfo, YearData } from "./types";
import {
  ALL_TEAM_IDS,
  HISTORICAL_ONLY_TEAM_IDS,
  type TeamId,
} from "./teams";
import { calcTeamWrc, type TeamWrc } from "./wrc";

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

export interface TeamWrcEntry extends TeamWrc {
  year: number;
}

/** 全年度・全球団分のチームwRC+を年度昇順で返す（チームwRC+一覧ページで使用） */
export async function getAllTeamWrc(): Promise<TeamWrcEntry[]> {
  const years = await getAvailableYears();
  const allData = await Promise.all(years.map((y) => getYearData(y)));
  const targetTeamIds: TeamId[] = [...ALL_TEAM_IDS, ...HISTORICAL_ONLY_TEAM_IDS];
  const entries: TeamWrcEntry[] = [];
  for (const data of allData) {
    if (!data) continue;
    for (const teamId of targetTeamIds) {
      const t = calcTeamWrc(data, teamId);
      if (t) entries.push({ year: data.year, ...t });
    }
  }
  entries.sort((a, b) => a.year - b.year);
  return entries;
}

let activeRosterNamesCache: string[] | null = null;

/**
 * 現在いずれかのNPB球団に登録されている選手名の一覧（scripts/build-active-roster.ts が
 * NPB公式の支配下選手一覧から生成）。MLB移籍等でNPB球団の登録から外れた選手は
 * 含まれないため、歴代ランキングの「現役選手のみ」フィルターでは別途手動リストと併用する。
 */
export async function getActiveRosterNames(): Promise<string[]> {
  if (activeRosterNamesCache) return activeRosterNamesCache;
  try {
    const raw = await readFile(path.join(DATA_DIR, "active-players.json"), "utf-8");
    activeRosterNamesCache = JSON.parse(raw) as string[];
  } catch {
    activeRosterNamesCache = [];
  }
  return activeRosterNamesCache;
}

/**
 * 選手の識別キー（nameKeyがあればそれを、なければ名前をそのまま）をキーにした
 * 全打者エントリの索引。初回アクセス時に一度だけ構築する。
 * nameKeyは同姓同名の別人が存在する選手のみ、npb.jpの選手個別IDベースで
 * scripts/fix-japanese-namesakes.ts が付与する（表示名は変えず内部識別のみに使う）。
 */
let identityIndexPromise: Promise<Map<string, BatterRanking[]>> | null = null;

async function getIdentityIndex(): Promise<Map<string, BatterRanking[]>> {
  if (!identityIndexPromise) {
    identityIndexPromise = (async () => {
      const all = await getAllBatters();
      const index = new Map<string, BatterRanking[]>();
      for (const b of all) {
        const key = b.nameKey ?? b.name;
        const list = index.get(key);
        if (list) list.push(b);
        else index.set(key, [b]);
      }
      return index;
    })();
  }
  return identityIndexPromise;
}

/**
 * 選手名（同姓同名の別人が存在する場合はnameKeyも）で全年度分のデータを横断検索する。
 * 複数球団に在籍したシーズン（トレード等）はそれぞれ別エントリとして返る。
 */
export async function getPlayerHistory(
  name: string,
  nameKey?: string
): Promise<BatterRanking[]> {
  const index = await getIdentityIndex();
  const history = [...(index.get(nameKey ?? name) ?? [])];
  history.sort((a, b) => a.year - b.year || a.teamId.localeCompare(b.teamId));
  return history;
}
