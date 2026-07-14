import type { CountingStats, YearData } from "./types";
import type { TeamId } from "./teams";

/**
 * wOBA線形加重係数（NPB版）。
 *
 * uBB=0.692 / HBP=0.73 / 単打=0.865 / 二塁打=1.334 / 三塁打=1.725 / 本塁打=2.065。
 * 本来「失策出塁」（係数0.966）の項も含まれるが、NPB公式サイトの通常の打撃成績表には
 * 失策出塁数が掲載されておらず現状のデータでは取得できないため、当サイトではこの項を
 * 省略している（＝失策で出塁した分はwOBA・wRC+に反映されない）。詳細は /about を参照。
 */
export const WOBA_WEIGHTS = {
  uBB: 0.692,
  HBP: 0.73,
  single: 0.865,
  double: 1.334,
  triple: 1.725,
  hr: 2.065,
};

/**
 * wOBAスケール定数（時代区分別）。
 *
 * MLBで一般的に使われる1.15をそのまま使うと、NPBの方が得点環境が低いため
 * （投手の打席が多い、本塁打が出にくい等）wRC+の振れ幅が実態より過大になってしまう。
 * そこで「チームwOBAとリーグ平均との差」が「チームの実得点/打席とリーグ平均との差」を
 * どれだけ説明するかを回帰分析し、実データから経験的に導出した値を使用している
 * （上記のNPB版係数に対して算出。算出スクリプトは scripts/derive-woba-scale.ts、
 * 時代区分ごとの再検証は各data/{year}.jsonのbattersを集計して回帰）。
 *
 * 得点環境は時代によって大きく異なるため（例: 1985年 得点/打席 約0.13、2025年 約0.09）、
 * 単一の固定値ではなく時代区分ごとの値を使う。1995-2004年はデータの断層により
 * 前後の区分よりやや低いスケール（＝wOBA差の割に得点差が小さい）が観測されている。
 */
const WOBA_SCALE_BY_ERA: { maxYear: number; scale: number }[] = [
  { maxYear: 1974, scale: 1.4608 },
  { maxYear: 1994, scale: 1.4391 },
  { maxYear: 2004, scale: 1.3578 },
  { maxYear: Infinity, scale: 1.3734 },
];

export function wobaScaleForYear(year: number): number {
  for (const era of WOBA_SCALE_BY_ERA) {
    if (year <= era.maxYear) return era.scale;
  }
  return WOBA_SCALE_BY_ERA[WOBA_SCALE_BY_ERA.length - 1].scale;
}

export function wobaNumerator(s: CountingStats): number {
  const uBB = s.bb - s.ibb;
  const singles = s.hits - s.doubles - s.triples - s.hr;
  return (
    WOBA_WEIGHTS.uBB * uBB +
    WOBA_WEIGHTS.HBP * s.hbp +
    WOBA_WEIGHTS.single * singles +
    WOBA_WEIGHTS.double * s.doubles +
    WOBA_WEIGHTS.triple * s.triples +
    WOBA_WEIGHTS.hr * s.hr
  );
}

export function wobaDenominator(s: CountingStats): number {
  return s.ab + (s.bb - s.ibb) + s.sf + s.hbp;
}

export function calcWoba(s: CountingStats): number {
  const denom = wobaDenominator(s);
  return denom > 0 ? wobaNumerator(s) / denom : 0;
}

/**
 * 簡易wRC+を計算する。
 *
 * wRC+ = 100 * ( (wRAA/PA)/(リーグ得点/PA) + 2 - パークファクター )
 *
 * parkFactorは「打者の本拠地球団のパークファクターを、年間約半分しか本拠地で
 * プレーしないことを踏まえて1.0側に半減させた値」（lib/parkFactor.tsのadjusted）を渡す。
 * 未指定の場合は1.0（補正なし）として扱う。
 */
export function calcWrcPlus(
  batter: CountingStats,
  lgWoba: number,
  lgRunsPerPa: number,
  parkFactor: number = 1,
  year: number = 2005
): number {
  if (batter.pa === 0 || lgRunsPerPa === 0) return 100;
  const batterWoba = calcWoba(batter);
  const wraa = ((batterWoba - lgWoba) / wobaScaleForYear(year)) * batter.pa;
  const wraaPerPa = wraa / batter.pa;
  return 100 * (wraaPerPa / lgRunsPerPa + 2 - parkFactor);
}

export function calcOps(obp: number, slg: number): number {
  return obp + slg;
}

export function emptyCountingStats(): CountingStats {
  return {
    games: 0,
    pa: 0,
    ab: 0,
    runs: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    totalBases: 0,
    rbi: 0,
    sb: 0,
    cs: 0,
    sh: 0,
    sf: 0,
    bb: 0,
    ibb: 0,
    hbp: 0,
    so: 0,
    gdp: 0,
  };
}

export function addCountingStats(a: CountingStats, b: CountingStats): void {
  a.games += b.games;
  a.pa += b.pa;
  a.ab += b.ab;
  a.runs += b.runs;
  a.hits += b.hits;
  a.doubles += b.doubles;
  a.triples += b.triples;
  a.hr += b.hr;
  a.totalBases += b.totalBases;
  a.rbi += b.rbi;
  a.sb += b.sb;
  a.cs += b.cs;
  a.sh += b.sh;
  a.sf += b.sf;
  a.bb += b.bb;
  a.ibb += b.ibb;
  a.hbp += b.hbp;
  a.so += b.so;
  a.gdp += b.gdp;
}

export interface TeamWrc {
  teamId: TeamId;
  teamName: string;
  league: "central" | "pacific";
  wrcPlus: number;
  pa: number;
  woba: number;
  hr: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  rbi: number;
  sb: number;
}

/**
 * チームwRC+を算出する。そのチーム・年度の全打者（投手の代打成績も含む、個人ページの
 * wRC+算出と同じ母集団）を合算し、個人と同じ式でリーグ平均・そのチームの本拠地
 * パークファクターと比較する。打席で加重した個人wRC+の平均と（PA重み付けなら）
 * 数学的にほぼ一致するが、チーム集計値から直接算出する方が頑健。
 */
export function calcTeamWrc(data: YearData, teamId: TeamId): TeamWrc | null {
  const teamBatters = data.batters.filter((b) => b.teamId === teamId);
  if (teamBatters.length === 0) return null;

  const totals = emptyCountingStats();
  for (const b of teamBatters) addCountingStats(totals, b);
  if (totals.pa === 0) return null;

  const league = teamBatters[0].league;
  const teamName = teamBatters[0].teamName;
  const { lgWoba, lgRunsPerPa } = data.leagueContext[league];
  const parkFactor = data.parkFactors[teamId]?.adjusted ?? 1;
  const wrcPlus = calcWrcPlus(totals, lgWoba, lgRunsPerPa, parkFactor, data.year);
  const woba = calcWoba(totals);

  const avg = totals.ab > 0 ? totals.hits / totals.ab : 0;
  const slg = totals.ab > 0 ? totals.totalBases / totals.ab : 0;
  const obpDenom = totals.ab + totals.bb + totals.hbp + totals.sf;
  const obp = obpDenom > 0 ? (totals.hits + totals.bb + totals.hbp) / obpDenom : 0;
  const ops = calcOps(obp, slg);

  return {
    teamId,
    teamName,
    league,
    wrcPlus,
    pa: totals.pa,
    woba,
    hr: totals.hr,
    avg,
    obp,
    slg,
    ops,
    rbi: totals.rbi,
    sb: totals.sb,
  };
}

/** wRC+の表示用フォーマット（整数表示。DELTA社等の一般的な表示に合わせる） */
export function fmtWrcPlus(v: number): string {
  return String(Math.round(v));
}
