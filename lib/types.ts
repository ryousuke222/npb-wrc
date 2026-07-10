import type { TeamId } from "./teams";

export type LeagueKey = "central" | "pacific";

export interface CountingStats {
  games: number;
  pa: number;
  ab: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  totalBases: number;
  rbi: number;
  sb: number;
  cs: number;
  sh: number;
  sf: number;
  bb: number;
  ibb: number;
  hbp: number;
  so: number;
  gdp: number;
}

export interface RateStats {
  avg: number;
  slg: number;
  obp: number;
}

export interface BatterRow extends CountingStats, RateStats {
  name: string;
  teamId: TeamId;
  teamName: string;
  league: LeagueKey;
}

export interface BatterRanking extends BatterRow {
  year: number;
  woba: number;
  ops: number;
  wrcPlus: number;
  /** 全打者（両リーグ・規定打席未満も含む）を通した一意な順位。URLの識別子として使用 */
  rank: number;
  /**
   * 同一年度・同一リーグ・規定打席到達者の中での順位（表示用）。
   * 規定打席未満の打者はnull（極端な小サンプルの打者が上位に来て
   * 意味のない順位になるのを避けるため、明示的に順位を出さない）。
   */
  leagueRank: number | null;
  parkFactor: number | null;
  /** その年度・その球団の規定打席（チーム試合数×3.1）に到達しているか */
  qualified: boolean;
}

export interface LeagueContext {
  lgWoba: number;
  lgRunsPerPa: number;
  totals: CountingStats;
}

export interface TeamParkFactorInfo {
  teamName: string;
  raw: number;
  adjusted: number;
  homeGames: number;
  awayGames: number;
  /** プールに実際に使われた年数（1〜5） */
  sampleYears: number;
  /** サンプル年数に応じた信頼度（この割合だけraw値を反映し、残りは1.0へ回帰させる） */
  confidence: number;
}

export interface YearData {
  year: number;
  generatedAt: string;
  seasonComplete: boolean;
  leagueContext: Record<LeagueKey, LeagueContext>;
  parkFactors: Record<string, TeamParkFactorInfo>;
  /** UIの打席数フィルターの初期値として使う目安値（その年度の規定打席の代表値） */
  regulationPaThreshold: number;
  batters: BatterRanking[];
}
