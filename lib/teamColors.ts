import type { TeamId } from "./teams";

export interface TeamColor {
  /** チームカラー（背景・アクセント用） */
  bg: string;
  /** bg の上に乗せる文字色 */
  on: string;
}

export const TEAM_COLORS: Record<TeamId, TeamColor> = {
  G: { bg: "#F97709", on: "#FFFFFF" }, // 巨人 オレンジ
  T: { bg: "#FFE100", on: "#111111" }, // 阪神 イエロー
  D: { bg: "#013C74", on: "#FFFFFF" }, // 中日 ネイビー
  S: { bg: "#00A64F", on: "#FFFFFF" }, // ヤクルト グリーン
  C: { bg: "#E60012", on: "#FFFFFF" }, // 広島 レッド
  YB: { bg: "#0F6CBD", on: "#FFFFFF" }, // DeNA ブルー
  H: { bg: "#F2A900", on: "#111111" }, // ソフトバンク ゴールド
  F: { bg: "#00A0DE", on: "#FFFFFF" }, // 日本ハム ターコイズ
  L: { bg: "#0056A8", on: "#FFFFFF" }, // 西武 ロイヤルブルー
  Bs: { bg: "#12274D", on: "#FFFFFF" }, // オリックス ネイビー
  M: { bg: "#1A1A1A", on: "#FFFFFF" }, // ロッテ ブラック
  E: { bg: "#870043", on: "#FFFFFF" }, // 楽天 クリムゾン
  Kn: { bg: "#7B1E3A", on: "#FFFFFF" }, // 近鉄 ワインレッド（歴史上のみの球団）
  Da: { bg: "#4B2E83", on: "#FFFFFF" }, // 大映 パープル（歴史上のみの球団）
  To: { bg: "#6B4F2D", on: "#FFFFFF" }, // トンボ ブラウン（歴史上のみの球団）
  Ta: { bg: "#476B8A", on: "#FFFFFF" }, // 高橋 スチールブルー（歴史上のみの球団）
};

export const FALLBACK_COLOR: TeamColor = { bg: "#9CA3AF", on: "#FFFFFF" };

export function teamColor(teamId: TeamId | null): TeamColor {
  if (!teamId) return FALLBACK_COLOR;
  return TEAM_COLORS[teamId] ?? FALLBACK_COLOR;
}

/** hex色に透明度を付与する（例: withAlpha("#F97709", 0.12)） */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
