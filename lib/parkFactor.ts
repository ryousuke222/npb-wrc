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
 * 球場改修・本拠地移転・ラッキーゾーンの設置/撤去などで環境が非連続に変化した球団の
 * 変化年（1球団が複数回変化している場合は昇順の配列）。対象年度を挟む「直前の変化年」
 * 〜「直後の変化年の前年」までを1つの環境（era）とみなし、そのera内でのみ年度をプール
 * する（変化前後のデータが混ざらないようにする）。2689web.comの試合結果（本拠地球場名）
 * から実際に検出した本拠地移転年に加え、公開資料で確認できたラッキーゾーンの設置/撤去年
 * も含む（2005年以降分はNPB公式サイトの情報と合わせている）。
 * - 読売: 1988年 後楽園球場→東京ドーム
 * - 中日: 1997年 ナゴヤ球場→ナゴヤドーム
 * - 阪神: 1992年 甲子園のラッキーゾーン撤去（1947年設置・1991年限りで撤去）
 * - ヤクルト（国鉄・サンケイ・アトムズ）: 1962年 神宮にラッキーゾーン設置、
 *   1967年 グラウンド改修に伴い撤去
 * - 阪急/オリックス: 1960年 西宮球場にラッキーゾーン設置、1991年 西宮球場→グリーン
 *   スタジアム神戸（西宮のラッキーゾーン自体は移転後の1992年頃撤去だが、その時点で
 *   既に神戸に移転済みのため当球団のPFには影響しない）
 * - 南海/ダイエー/ソフトバンク: 1993年 大阪球場→福岡ドーム、2015年 テラス席設置
 * - 日本ハム: 1988年 後楽園球場→東京ドーム（巨人とダブルフランチャイズ）、
 *   2004年 札幌ドームへ移転、2023年 エスコンフィールドへ移転
 * - 西鉄/太平洋クラブ/クラウンライター/西武: 1967年 平和台にラッキーゾーン設置、
 *   1979年 平和台球場（福岡）→西武ライオンズ球場（所沢）、1998年 同球場に屋根設置
 *   （西武ドーム化）
 * - ロッテ: 1992年 川崎球場→千葉マリンスタジアム
 * - 広島東洋: 2009年 マツダスタジアムへ本拠地移転
 *
 * 参考: 甲子園・神宮・西宮・平和台のラッキーゾーン設置/撤去年は、当サイトの試合結果
 * データ自体からは検出できない（球場名は変わらないため）。日本野球機構・各球場の
 * 公式サイトや報道等の公開情報をもとに手動で反映している。
 */
export const PARK_RENOVATION_YEARS: Partial<Record<TeamId, number[]>> = {
  G: [1988],
  D: [1997],
  T: [1992],
  S: [1962, 1967],
  Bs: [1960, 1991],
  H: [1993, 2015],
  F: [1988, 2004, 2023],
  L: [1967, 1979, 1998],
  M: [1992],
  C: [2009],
};

/** 前方窓（改修年基準）の重み。offset 0(改修年)〜4年後。 era内の年数が少ない場合のフォールバック用 */
const FORWARD_WEIGHTS = [5, 4, 3, 2, 1];
/** 中心加重窓で、対象年度に近い順（最大5年）に割り当てる重み */
const CENTER_RANK_WEIGHTS = [5, 4, 4, 3, 3];

/**
 * 対象年度が属する「環境（era）」の年度範囲を返す（下限は含む、上限は含まない）。
 * 該当球団の変化年履歴がない場合は両方null。
 */
function getEraBounds(
  team: TeamId,
  year: number
): { lowerBound: number | null; upperBoundExclusive: number | null } {
  const renovations = PARK_RENOVATION_YEARS[team];
  let lowerBound: number | null = null;
  let upperBoundExclusive: number | null = null;
  if (renovations) {
    for (const r of [...renovations].sort((a, b) => a - b)) {
      if (r <= year) lowerBound = r;
      else {
        upperBoundExclusive = r;
        break;
      }
    }
  }
  return { lowerBound, upperBoundExclusive };
}

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
 * 対象年度を中心とした最大5年窓を使うが、変化年履歴がある球団（PARK_RENOVATION_YEARS）
 * は対象年度が属するera（直前の変化年〜直後の変化年の前年）の範囲内でのみプールし、
 * 変化前後のデータが混ざらないようにする。データ範囲・era範囲の端で片側にしか
 * データがない場合は「対象年度に近い順」に最大5年を選び、近さの順位（0,1,1,2,2番目）
 * に応じた重み[5,4,4,3,3]を割り当てる（片側しかなければ自動的にその方向へ延長される）。
 * era境界のすぐ後ろ等でこの窓が空になった場合のみ、eraの下限を起点とする前方窓に
 * フォールバックする。
 */
export function getPoolYears(
  team: TeamId,
  year: number,
  hasData: (y: number) => boolean
): { year: number; weight: number }[] {
  const { lowerBound, upperBoundExclusive } = getEraBounds(team, year);
  const inEra = (y: number) =>
    (lowerBound === null || y >= lowerBound) &&
    (upperBoundExclusive === null || y < upperBoundExclusive);

  const candidateYears = new Set<number>([year]);
  for (let offset = 1; offset <= 4; offset++) {
    candidateYears.add(year - offset);
    candidateYears.add(year + offset);
  }
  const sorted = [...candidateYears]
    .filter((y) => inEra(y) && hasData(y))
    .sort((a, b) => Math.abs(a - year) - Math.abs(b - year) || a - b)
    .slice(0, 5);
  if (sorted.length > 0) {
    return sorted.map((y, i) => ({ year: y, weight: CENTER_RANK_WEIGHTS[i] }));
  }

  if (lowerBound === null) return [];
  const pool: { year: number; weight: number }[] = [];
  for (let i = 0; i < FORWARD_WEIGHTS.length; i++) {
    const y = lowerBound + i;
    if (inEra(y) && hasData(y)) pool.push({ year: y, weight: FORWARD_WEIGHTS[i] });
  }
  return pool;
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
