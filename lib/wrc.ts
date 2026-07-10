import type { CountingStats } from "./types";

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
 * wOBAスケール定数。
 *
 * MLBで一般的に使われる1.15をそのまま使うと、NPBの方が得点環境が低いため
 * （投手の打席が多い、本塁打が出にくい等）wRC+の振れ幅が実態より過大になってしまう。
 * そこで、2005年以降の全球団・全年度（264チームシーズン）の「チームwOBAとリーグ平均との差」
 * が「チームの実得点/打席とリーグ平均との差」をどれだけ説明するかを回帰分析し、
 * 実データから経験的に導出した値を使用している（上記のNPB版係数に対してR^2=0.8605、
 * 算出スクリプトは scripts/derive-woba-scale.ts）。
 */
export const WOBA_SCALE = 1.372;

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
  parkFactor: number = 1
): number {
  if (batter.pa === 0 || lgRunsPerPa === 0) return 100;
  const batterWoba = calcWoba(batter);
  const wraa = ((batterWoba - lgWoba) / WOBA_SCALE) * batter.pa;
  const wraaPerPa = wraa / batter.pa;
  return 100 * (wraaPerPa / lgRunsPerPa + 2 - parkFactor);
}

export function calcOps(obp: number, slg: number): number {
  return obp + slg;
}

/** wRC+の表示用フォーマット（整数表示。DELTA社等の一般的な表示に合わせる） */
export function fmtWrcPlus(v: number): string {
  return String(Math.round(v));
}
