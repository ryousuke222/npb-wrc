/**
 * 球団名・略称は年度によって表記が変わる（横浜→DeNA、ダイエー→ソフトバンク等）ため、
 * 「本拠地」が変わらない限り同一チームとして扱うための固定IDに正規化する。
 */
export type TeamId =
  | "G"
  | "T"
  | "D"
  | "S"
  | "C"
  | "YB"
  | "H"
  | "F"
  | "L"
  | "M"
  | "Bs"
  | "E"
  /** 近鉄バファローズ。2004年限りで消滅（2005年にオリックスと合併）した歴史上のみの球団 */
  | "Kn"
  /**
   * 大映スターズ（トンボ/高橋ユニオンズも同系譜として扱う）。1957年限りで消滅
   * （1958年に毎日と合併し大毎オリオンズに）した歴史上のみの球団。
   * 毎日はそのままロッテ系譜(M)として存続するため、Knの前例と同様に別IDとして分離する。
   */
  | "Da";

export const ALL_TEAM_IDS: TeamId[] = [
  "G",
  "T",
  "D",
  "S",
  "C",
  "YB",
  "H",
  "F",
  "L",
  "M",
  "Bs",
  "E",
];

/** 現在は消滅している歴史上のみの球団（現行の年度別ランキング等では対象外） */
export const HISTORICAL_ONLY_TEAM_IDS: TeamId[] = ["Kn", "Da"];

const TEAM_ID_BY_FULLNAME: Record<string, TeamId> = {
  読売: "G",
  巨人: "G",
  阪神: "T",
  中日: "D",
  東京ヤクルト: "S",
  ヤクルト: "S",
  広島東洋: "C",
  広島: "C",
  横浜DeNA: "YB",
  横浜: "YB",
  DeNA: "YB",
  福岡ソフトバンク: "H",
  ソフトバンク: "H",
  福岡ダイエー: "H",
  ダイエー: "H",
  北海道日本ハム: "F",
  日本ハム: "F",
  埼玉西武: "L",
  西武: "L",
  千葉ロッテ: "M",
  ロッテ: "M",
  オリックス: "Bs",
  東北楽天: "E",
  楽天: "E",
  大阪近鉄: "Kn",
  近鉄: "Kn",

  // 現行球団の前身にあたる歴史上の球団名（1955年以降に登場するもののみ網羅すれば十分。
  // それ以前の球団名はparseHistoricalPlayerPage側の年度フィルターで除外される）
  // 大阪タイガース（阪神の旧称。2689web.comの試合ページタイトルでは1958年以前
  // 「大阪」表記のため、大阪近鉄(Kn)とは別に完全一致キーとして追加）
  大阪: "T",
  南海: "H",
  阪急: "Bs",
  西鉄: "L",
  東映: "F",
  日拓: "F",
  国鉄: "S",
  サンケイ: "S",
  アトムズ: "S",
  大洋: "YB",
  横浜大洋: "YB",
  毎日: "M",
  大毎: "M",
  東京: "M",
  太平洋: "L",
  クラウン: "L",

  // 大映スターズ（トンボ/高橋ユニオンズ含む、1958年に毎日と合併し消滅）
  大映: "Da",
  トンボ: "Da",
  高橋: "Da",
};

/** 試合日程ページ・チーム成績ページに現れる球団名（全角スペース混じり）をチームIDに変換する */
export function teamIdFromGameName(rawName: string): TeamId | null {
  const normalized = rawName.replace(/[\s　]/g, "");
  const exact = TEAM_ID_BY_FULLNAME[normalized];
  if (exact) return exact;

  // ボックススコア等では「オリックス・バファローズ」のような正式名称（球団名の
  // 略称を含むがそれ自体は辞書に完全一致しない）が使われることがあるため、
  // 辞書のキーが部分文字列として含まれるかで判定する（最長一致を優先）
  const candidates = Object.keys(TEAM_ID_BY_FULLNAME)
    .filter((key) => normalized.includes(key))
    .sort((a, b) => b.length - a.length);
  return candidates.length > 0 ? TEAM_ID_BY_FULLNAME[candidates[0]] : null;
}

/** 表示用のフォールバック名（該当年度・球団のデータが見つからない場合に使用） */
export const TEAM_ID_DEFAULT_NAME: Record<TeamId, string> = {
  G: "巨人",
  T: "阪神",
  D: "中日",
  S: "ヤクルト",
  C: "広島",
  YB: "DeNA",
  H: "ソフトバンク",
  F: "日本ハム",
  L: "西武",
  M: "ロッテ",
  Bs: "オリックス",
  E: "楽天",
  Kn: "近鉄",
  Da: "大映",
};
