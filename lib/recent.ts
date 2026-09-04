import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getLatestYear, getYearData } from "./data";
import { playerIdentityKey } from "./playerIdentity";
import type { BatterRanking, LeagueKey, YearData } from "./types";
import type { TeamId } from "./teams";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");
const TARGET_GAMES = 10;

export type RecentBatter = {
  batter: BatterRanking;
  games: number;
  pa: number;
  hits: number;
  hr: number;
  rbi: number;
  avg: number;
  ops: number;
};

export type RecentRanking = {
  year: number;
  central: RecentBatter[];
  pacific: RecentBatter[];
  reference: string;
};

function playerKey(batter: BatterRanking): string {
  return playerIdentityKey(batter);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

function teamGames(data: YearData, teamId: TeamId): number {
  return data.teamGames?.[teamId] ?? Math.max(
    0,
    ...data.batters.filter((batter) => batter.teamId === teamId).map((batter) => batter.games)
  );
}

async function getSnapshots(year: number): Promise<YearData[]> {
  try {
    const directory = path.join(SNAPSHOT_DIR, String(year));
    const entries = await readdir(directory);
    const snapshots = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => JSON.parse(await readFile(path.join(directory, entry), "utf-8")) as YearData)
    );
    return snapshots.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
  } catch {
    return [];
  }
}

function difference(current: BatterRanking, previous: BatterRanking, games: number): RecentBatter | null {
  const pa = current.pa - previous.pa;
  const ab = current.ab - previous.ab;
  const hits = current.hits - previous.hits;
  const doubles = current.doubles - previous.doubles;
  const triples = current.triples - previous.triples;
  const hr = current.hr - previous.hr;
  const bb = current.bb - previous.bb;
  const hbp = current.hbp - previous.hbp;
  const sf = current.sf - previous.sf;
  const rbi = current.rbi - previous.rbi;

  const regulationPa = Math.ceil(games * 3.1);
  if (pa < regulationPa || ab <= 0 || [hits, doubles, triples, hr, bb, hbp, sf, rbi].some((value) => value < 0)) {
    return null;
  }

  const avg = hits / ab;
  const obpDenominator = ab + bb + hbp + sf;
  const obp = obpDenominator > 0 ? (hits + bb + hbp) / obpDenominator : 0;
  const slg = (hits + doubles + triples * 2 + hr * 3) / ab;

  return { batter: current, games, pa, hits, hr, rbi, avg, ops: obp + slg };
}

/**
 * 球団ごとに10試合以上前の最も近い日次保存値を基準にして、直近10試合前後の
 * 期間成績を算出する。日次スナップショットの間隔により、対象試合数は10〜12試合になる。
 */
export async function getRecentTenGameRanking(): Promise<RecentRanking | null> {
  const year = await getLatestYear();
  const current = await getYearData(year);
  if (!current) return null;

  const snapshots = await getSnapshots(year);
  const currentTimestamp = new Date(current.generatedAt).getTime();
  const earlier = snapshots.filter((snapshot) => new Date(snapshot.generatedAt).getTime() < currentTimestamp);
  const rows: Record<LeagueKey, RecentBatter[]> = { central: [], pacific: [] };

  for (const batter of current.batters) {
    const currentGames = teamGames(current, batter.teamId);
    const baseline = [...earlier].reverse().find((snapshot) =>
      currentGames - teamGames(snapshot, batter.teamId) >= TARGET_GAMES
    );
    if (!baseline) continue;

    const previous = baseline.batters.find((entry) => playerKey(entry) === playerKey(batter));
    if (!previous) continue;

    const row = difference(batter, previous, currentGames - teamGames(baseline, batter.teamId));
    if (row) rows[batter.league].push(row);
  }

  const rank = (league: LeagueKey) => rows[league]
    .sort((a, b) => b.ops - a.ops || b.hits - a.hits || b.hr - a.hr)
    .slice(0, 10);

  return {
    year,
    central: rank("central"),
    pacific: rank("pacific"),
    reference: formatDate(current.generatedAt),
  };
}
