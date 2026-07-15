import type { TeamId } from "./teams";
import type { LeagueKey } from "./types";

export type CompareBatterRow = [
  year: number,
  rank: number,
  name: string,
  teamId: TeamId,
  teamName: string,
  league: LeagueKey,
  qualified: boolean,
  wrcPlus: number,
  woba: number,
  parkFactor: number | null,
  pa: number,
  avg: number,
  obp: number,
  slg: number,
  ops: number,
  hr: number,
  rbi: number,
  sb: number,
];

export interface ComparePreset {
  label: string;
  ids: string[];
}

export interface CompareIndex {
  rows: CompareBatterRow[];
  presets: ComparePreset[];
}
