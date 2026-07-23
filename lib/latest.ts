import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getLatestYear, getYearData } from "./data";
import type { BatterRanking, YearData } from "./types";
import { ALL_TEAM_IDS, type TeamId } from "./teams";
import { calcTeamWrc, type TeamWrc } from "./wrc";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

export type BatterChange = {
  batter: BatterRanking;
  difference: number;
};

export type MvpCandidate = {
  batter: BatterRanking;
  /**
   * 同一リーグ内の首位を100とする打撃総合スコア。
   * 率の指標であるwRC+を半分、得点に直結する本塁打と打点を各4分の1としている。
   */
  score: number;
};

export type WeeklyMovement = {
  wrcPlus: BatterChange[];
  hr: BatterChange[];
  pa: BatterChange[];
  ops: BatterChange[];
};

export type LatestDashboardData = {
  year: number;
  data: YearData;
  teams: TeamWrc[];
  leagueLeaders: Record<"central" | "pacific", BatterRanking[]>;
  mvpCandidates: Record<"central" | "pacific", MvpCandidate[]>;
  weeklyMovement: WeeklyMovement | null;
  comparisonLabel: string | null;
};

function playerKey(batter: BatterRanking): string {
  // 同名選手とシーズン中の移籍を区別するため、球団も含める。
  return `${batter.nameKey ?? batter.name}|${batter.teamId}`;
}

async function getSnapshots(year: number): Promise<YearData[]> {
  const directory = path.join(SNAPSHOT_DIR, String(year));
  try {
    const entries = await readdir(directory);
    const snapshots = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => JSON.parse(await readFile(path.join(directory, entry), "utf-8")) as YearData)
    );
    return snapshots.sort(
      (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
    );
  } catch {
    return [];
  }
}

/**
 * 「今週伸びた」は、最新値から6日以上前の最も新しい保存値と比較する。
 * まだ比較できるスナップショットがない間は null を返し、推測値を表示しない。
 */
async function getWeeklyMovement(current: YearData): Promise<{
  movement: WeeklyMovement | null;
  label: string | null;
}> {
  const snapshots = await getSnapshots(current.year);
  const currentTime = new Date(current.generatedAt).getTime();
  const cutoff = currentTime - 6 * 24 * 60 * 60 * 1000;
  const baseline = snapshots.filter((snapshot) => new Date(snapshot.generatedAt).getTime() <= cutoff).at(-1);

  if (!baseline) return { movement: null, label: null };

  const previous = new Map(baseline.batters.map((batter) => [playerKey(batter), batter]));
  const changes = current.batters
    .filter((batter) => batter.pa >= 30)
    .map((batter) => {
      const old = previous.get(playerKey(batter));
      return old ? { batter, old } : null;
    })
    .filter((entry): entry is { batter: BatterRanking; old: BatterRanking } => entry !== null);

  const topChanges = (getDifference: (entry: { batter: BatterRanking; old: BatterRanking }) => number) =>
    changes
      .map((entry) => ({ batter: entry.batter, difference: getDifference(entry) }))
      .filter((entry) => Number.isFinite(entry.difference))
      .sort((a, b) => b.difference - a.difference)
      .slice(0, 10);

  const from = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).format(new Date(baseline.generatedAt));
  const to = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).format(new Date(current.generatedAt));

  return {
    movement: {
      wrcPlus: topChanges(({ batter, old }) => batter.wrcPlus - old.wrcPlus),
      hr: topChanges(({ batter, old }) => batter.hr - old.hr),
      pa: topChanges(({ batter, old }) => batter.pa - old.pa),
      // 10打席以上増えた選手だけを対象にし、小サンプルの極端な変化を避ける。
      ops: topChanges(({ batter, old }) => (batter.pa - old.pa >= 10 ? batter.ops - old.ops : -Infinity)),
    },
    label: `${from} → ${to}`,
  };
}

export async function getTeamWeeklyRisers(data: YearData, teamId: TeamId): Promise<BatterChange[] | null> {
  const { movement } = await getWeeklyMovement(data);
  return movement?.wrcPlus.filter(({ batter }) => batter.teamId === teamId).slice(0, 3) ?? null;
}

export async function getLatestDashboardData(): Promise<LatestDashboardData | null> {
  const year = await getLatestYear();
  const data = await getYearData(year);
  if (!data) return null;

  const teams = ALL_TEAM_IDS
    .map((teamId) => calcTeamWrc(data, teamId as TeamId))
    .filter((entry): entry is TeamWrc => entry !== null)
    .sort((a, b) => b.wrcPlus - a.wrcPlus);

  const qualified = data.batters.filter((batter) => batter.qualified);
  const byLeague = (league: "central" | "pacific") =>
    qualified
      .filter((batter) => batter.league === league)
      .sort((a, b) => b.wrcPlus - a.wrcPlus);
  const mvpByLeague = (league: "central" | "pacific") => {
    const batters = qualified.filter((batter) => batter.league === league);
    const leaders = {
      wrcPlus: Math.max(...batters.map((batter) => batter.wrcPlus), 1),
      hr: Math.max(...batters.map((batter) => batter.hr), 1),
      rbi: Math.max(...batters.map((batter) => batter.rbi), 1),
    };

    return batters
      .map((batter) => ({
        batter,
        // MVP投票で目に留まりやすい長打・打点も反映し、wRC+上位とは別の見方を作る。
        score:
          (batter.wrcPlus / leaders.wrcPlus) * 50 +
          (batter.hr / leaders.hr) * 25 +
          (batter.rbi / leaders.rbi) * 25,
      }))
      .sort((a, b) => b.score - a.score);
  };

  const { movement: weeklyMovement, label: comparisonLabel } = await getWeeklyMovement(data);

  return {
    year,
    data,
    teams,
    leagueLeaders: {
      central: byLeague("central").slice(0, 10),
      pacific: byLeague("pacific").slice(0, 10),
    },
    // 守備・走塁は含まないため、打撃面に限定した「現時点の候補」として表示する。
    mvpCandidates: {
      central: mvpByLeague("central").slice(0, 5),
      pacific: mvpByLeague("pacific").slice(0, 5),
    },
    weeklyMovement,
    comparisonLabel,
  };
}
