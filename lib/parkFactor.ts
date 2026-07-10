import type { GameResult } from "./npbGames";
import type { TeamId } from "./teams";

export interface TeamSplit {
  homeGames: number;
  homeRunsFor: number;
  homeRunsAgainst: number;
  awayGames: number;
  awayRunsFor: number;
  awayRunsAgainst: number;
}

function emptySplit(): TeamSplit {
  return {
    homeGames: 0,
    homeRunsFor: 0,
    homeRunsAgainst: 0,
    awayGames: 0,
    awayRunsFor: 0,
    awayRunsAgainst: 0,
  };
}

const MIN_VENUE_SHARE = 0.15;

/**
 * パークファクター算出用に試合結果を絞り込む。
 *
 * - 交流戦は「本拠地でしか対戦しない相手／敵地でしか対戦しない相手」が生じ、
 *   本拠地・他球場で同じ対戦相手の内訳を保てなくなるため除外する。
 * - 地方球場（プロモーション目的の臨時開催試合）は、その球団の「本拠地」の
 *   実態を表さないため除外する。ここでは「その球団の同一リーグ本拠地試合のうち
 *   一定割合（15%）未満しか使われていない球場」を地方球場とみなす
 *   （オリックスの京セラドーム大阪／ほっと神戸のように、複数球場を正式に
 *   本拠地としているケースは両方とも残す）。
 *
 * 年度によって本拠地球場が変わりうる（本拠地移転等）ため、単年の試合結果に対して使う。
 */
export function filterGamesForParkFactor(games: GameResult[]): GameResult[] {
  const sameLeagueGames = games.filter((g) => !g.interleague);
  const primaryVenuesByTeam = getPrimaryVenuesByTeam(games);

  return sameLeagueGames.filter((g) =>
    primaryVenuesByTeam.get(g.homeTeam)?.has(g.venue)
  );
}

/**
 * 球団ごとの「本拠地球場」の集合を求める（同一リーグ本拠地試合のうち一定割合(15%)
 * 以上使われている球場）。地方球場（臨時開催）の判定に使う。
 * 本拠地移転があった球団は年度ごとにこの判定をやり直す想定のため、単年の試合結果に対して使う。
 */
export function getPrimaryVenuesByTeam(
  games: GameResult[]
): Map<TeamId, Set<string>> {
  const sameLeagueGames = games.filter((g) => !g.interleague);

  const venueCountByTeam = new Map<TeamId, Map<string, number>>();
  for (const g of sameLeagueGames) {
    const counts = venueCountByTeam.get(g.homeTeam) ?? new Map<string, number>();
    counts.set(g.venue, (counts.get(g.venue) ?? 0) + 1);
    venueCountByTeam.set(g.homeTeam, counts);
  }

  const primaryVenuesByTeam = new Map<TeamId, Set<string>>();
  for (const [teamId, counts] of venueCountByTeam) {
    const total = [...counts.values()].reduce((s, v) => s + v, 0);
    const primary = new Set(
      [...counts.entries()]
        .filter(([, count]) => count / total >= MIN_VENUE_SHARE)
        .map(([venue]) => venue)
    );
    primaryVenuesByTeam.set(teamId, primary);
  }

  return primaryVenuesByTeam;
}

export function aggregateTeamSplits(
  games: GameResult[]
): Record<TeamId, TeamSplit> {
  const splits = {} as Record<TeamId, TeamSplit>;
  const get = (id: TeamId) => (splits[id] ??= emptySplit());

  for (const g of games) {
    const home = get(g.homeTeam);
    home.homeGames += 1;
    home.homeRunsFor += g.homeScore;
    home.homeRunsAgainst += g.awayScore;

    const away = get(g.awayTeam);
    away.awayGames += 1;
    away.awayRunsFor += g.awayScore;
    away.awayRunsAgainst += g.homeScore;
  }

  return splits;
}

export interface ParkFactor {
  /**
   * 素の年度別パークファクター（複数年加重プール・信頼度回帰後）。
   * 本拠地の(得点+失点)/試合 ÷「6本拠地（自チーム含む）で均等にプレーした場合の期待値」
   * （= 他球場平均×5/6 + 本拠地平均×1/6）。
   */
  raw: number;
  /** 打者は年間の約半分しか本拠地でプレーしないことを踏まえ、1.0側に半減させた値。wRC+の計算に使用 */
  adjusted: number;
  homeGames: number;
  awayGames: number;
  /** プールに実際に使われた年数（1〜5） */
  sampleYears: number;
  /** サンプル年数に応じた信頼度（この割合だけraw値を反映し、残りは1.0へ回帰させる） */
  confidence: number;
}

const MIN_GAMES = 40;

/**
 * 球場改修・本拠地移転などで环境が非連続に変化した球団。変化があった年度以降は、
 * 変化前のデータを混ぜると歪むため、変化年を起点とする前方窓（改修年を最大重みとし、
 * 未来方向にのみ重みを減衰させる）に切り替える。
 * - 広島東洋: 2009年 マツダスタジアムへ本拠地移転
 * - 福岡ソフトバンク: 2015年 ヤフオクドームにテラス席設置
 * - 北海道日本ハム: 2023年 エスコンフィールドへ本拠地移転
 */
export const PARK_RENOVATION_YEARS: Partial<Record<TeamId, number>> = {
  C: 2009,
  H: 2015,
  F: 2023,
};

/** 前方窓（改修年基準）の重み。offset 0(改修年)〜4年後 */
const FORWARD_WEIGHTS = [5, 4, 3, 2, 1];
/** 中心加重窓（改修なし球団）で、対象年度に近い順（最大5年）に割り当てる重み */
const CENTER_RANK_WEIGHTS = [5, 4, 4, 3, 3];

const CONFIDENCE_BY_SAMPLE_YEARS: Record<number, number> = {
  1: 0.5,
  2: 0.6,
  3: 0.7,
  4: 0.8,
  5: 0.9,
};

/**
 * 対象年度・球団についてパークファクター算出に使う年度と重みの一覧を求める。
 *
 * 改修等で本拠地環境が変わった球団（PARK_RENOVATION_YEARS）は、変化年以降は
 * 変化年を起点とする前方窓（未来方向のみ、最大5年）を使う。
 * それ以外の球団は対象年度を中心とした最大5年窓を使うが、データ範囲の端
 * （2005年付近・最新年度付近）では片側にしかデータがないため、
 * 「対象年度に近い順」に最大5年を選び、近さの順位（0,1,1,2,2番目）に応じた
 * 重み[5,4,4,3,3]を割り当てる（片側しかない場合は自動的にその方向へ延長される）。
 */
export function getPoolYears(
  team: TeamId,
  year: number,
  hasData: (y: number) => boolean
): { year: number; weight: number }[] {
  const renovation = PARK_RENOVATION_YEARS[team];
  if (renovation !== undefined && year >= renovation) {
    const pool: { year: number; weight: number }[] = [];
    for (let i = 0; i < FORWARD_WEIGHTS.length; i++) {
      const y = renovation + i;
      if (hasData(y)) pool.push({ year: y, weight: FORWARD_WEIGHTS[i] });
    }
    return pool;
  }

  const candidateYears = new Set<number>([year]);
  for (let offset = 1; offset <= 4; offset++) {
    candidateYears.add(year - offset);
    candidateYears.add(year + offset);
  }
  const sorted = [...candidateYears]
    .filter(hasData)
    .sort((a, b) => Math.abs(a - year) - Math.abs(b - year) || a - b)
    .slice(0, 5);
  return sorted.map((y, i) => ({ year: y, weight: CENTER_RANK_WEIGHTS[i] }));
}

/**
 * 球団ごとのパークファクターを、複数年の加重プール＋信頼度回帰で計算する。
 * 本拠地/ビジターそれぞれの実試合数（重み無し合計）が少なすぎる場合は
 * 信頼できないためnullを返す（呼び出し側でPF=1として扱う）。
 */
export function calcWeightedParkFactor(
  team: TeamId,
  year: number,
  splitsByYear: Map<number, TeamSplit>,
  hasData: (y: number) => boolean
): ParkFactor | null {
  const pool = getPoolYears(team, year, hasData);
  if (pool.length === 0) return null;

  let wHomeGames = 0;
  let wHomeRuns = 0;
  let wAwayGames = 0;
  let wAwayRuns = 0;
  let rawHomeGames = 0;
  let rawAwayGames = 0;

  for (const { year: y, weight } of pool) {
    const s = splitsByYear.get(y);
    if (!s) continue;
    wHomeGames += weight * s.homeGames;
    wHomeRuns += weight * (s.homeRunsFor + s.homeRunsAgainst);
    wAwayGames += weight * s.awayGames;
    wAwayRuns += weight * (s.awayRunsFor + s.awayRunsAgainst);
    rawHomeGames += s.homeGames;
    rawAwayGames += s.awayGames;
  }

  if (rawHomeGames < MIN_GAMES || rawAwayGames < MIN_GAMES) return null;
  if (wHomeGames === 0 || wAwayGames === 0) return null;

  const homePerGame = wHomeRuns / wHomeGames;
  const awayPerGame = wAwayRuns / wAwayGames;
  if (awayPerGame === 0) return null;

  // 「6本拠地で均等にプレーした場合」の期待値（自チーム1/6 + 他5球団5/6）と比較する
  const blendedPerGame = (awayPerGame * 5 + homePerGame * 1) / 6;
  if (blendedPerGame === 0) return null;
  const rawPf = homePerGame / blendedPerGame;

  const sampleYears = pool.length;
  const confidence = CONFIDENCE_BY_SAMPLE_YEARS[sampleYears] ?? 0.5;
  const shrunkRaw = rawPf * confidence + 1 * (1 - confidence);
  const adjusted = (shrunkRaw + 1) / 2;

  return {
    raw: shrunkRaw,
    adjusted,
    homeGames: rawHomeGames,
    awayGames: rawAwayGames,
    sampleYears,
    confidence,
  };
}
