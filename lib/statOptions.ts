import type { BatterRanking } from "./types";
import { fmtWrcPlus } from "./wrc";

export function fmtRate(n: number): string {
  return n.toFixed(3).replace(/^0\./, ".");
}

export type StatKey = "wrcPlus" | "avg" | "obp" | "slg" | "ops" | "hr" | "rbi" | "sb";

export interface StatOption {
  key: StatKey;
  label: string;
  getValue: (b: BatterRanking) => number;
  formatValue: (n: number) => string;
  flatColor?: boolean;
}

export const STAT_OPTIONS: StatOption[] = [
  { key: "wrcPlus", label: "wRC+", getValue: (b) => b.wrcPlus, formatValue: fmtWrcPlus },
  { key: "avg", label: "打率", getValue: (b) => b.avg, formatValue: fmtRate, flatColor: true },
  { key: "obp", label: "出塁率", getValue: (b) => b.obp, formatValue: fmtRate, flatColor: true },
  { key: "slg", label: "長打率", getValue: (b) => b.slg, formatValue: fmtRate, flatColor: true },
  { key: "ops", label: "OPS", getValue: (b) => b.ops, formatValue: fmtRate, flatColor: true },
  { key: "hr", label: "本塁打", getValue: (b) => b.hr, formatValue: (n) => String(n), flatColor: true },
  { key: "rbi", label: "打点", getValue: (b) => b.rbi, formatValue: (n) => String(n), flatColor: true },
  { key: "sb", label: "盗塁", getValue: (b) => b.sb, formatValue: (n) => String(n), flatColor: true },
];

export function getStatOption(key: StatKey): StatOption {
  return STAT_OPTIONS.find((s) => s.key === key) ?? STAT_OPTIONS[0];
}
