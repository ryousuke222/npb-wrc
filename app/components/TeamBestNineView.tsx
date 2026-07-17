"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BatterRanking } from "@/lib/types";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { ALL_TEAM_IDS, TEAM_ID_DEFAULT_NAME, type TeamId } from "@/lib/teams";
import { fmtWrcPlus } from "@/lib/wrc";

const POSITIONS = [
  { key: "捕手", label: "捕手", slots: 1 },
  { key: "一塁手", label: "一塁手", slots: 1 },
  { key: "二塁手", label: "二塁手", slots: 1 },
  { key: "三塁手", label: "三塁手", slots: 1 },
  { key: "遊撃手", label: "遊撃手", slots: 1 },
  { key: "外野手", label: "外野手", slots: 3 },
] as const;

const POSITION_BADGE: Record<string, string> = {
  捕手: "捕",
  一塁手: "一",
  二塁手: "二",
  三塁手: "三",
  遊撃手: "遊",
  外野手: "外",
};

function bestSeasonsForPosition(
  batters: BatterRanking[],
  position: string,
  slots: number
): BatterRanking[] {
  const bestByPlayer = new Map<string, BatterRanking>();

  for (const batter of batters) {
    if (batter.position !== position || !batter.qualified) continue;
    const current = bestByPlayer.get(batter.name);
    if (!current || batter.wrcPlus > current.wrcPlus || (batter.wrcPlus === current.wrcPlus && batter.pa > current.pa)) {
      bestByPlayer.set(batter.name, batter);
    }
  }

  return [...bestByPlayer.values()]
    .sort((a, b) => b.wrcPlus - a.wrcPlus || b.pa - a.pa)
    .slice(0, slots);
}

export default function TeamBestNineView({ batters }: { batters: BatterRanking[] }) {
  const [teamId, setTeamId] = useState<TeamId>("G");
  const teamBatters = useMemo(() => batters.filter((batter) => batter.teamId === teamId), [batters, teamId]);
  const color = teamColor(teamId);

  const selections = useMemo(
    () =>
      POSITIONS.map((position) => ({
        ...position,
        batters: bestSeasonsForPosition(teamBatters, position.key, position.slots),
      })),
    [teamBatters]
  );

  return (
    <div>
      <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
        <label htmlFor="best-nine-team" className="mb-1 block text-[11px] font-medium text-zinc-400">
          球団を選ぶ
        </label>
        <select
          id="best-nine-team"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value as TeamId)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
        >
          {ALL_TEAM_IDS.map((id) => (
            <option key={id} value={id}>
              {TEAM_ID_DEFAULT_NAME[id]}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{ borderTopColor: color.bg, backgroundColor: withAlpha(color.bg, 0.06) }}
        className="rounded-2xl border border-t-[6px] border-zinc-200 p-4 sm:p-6"
      >
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900">
            {TEAM_ID_DEFAULT_NAME[teamId]} 歴代ベストナイン
          </h2>
          <span className="text-xs text-zinc-400">投手を除く各ポジションの最高wRC+</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selections.flatMap((position) =>
            position.batters.map((batter, index) => {
              const batterColor = teamColor(batter.teamId);
              const positionLabel = position.slots === 3 ? `外野手 ${index + 1}` : position.label;
              const badge = position.key === "外野手" ? `外${index + 1}` : POSITION_BADGE[position.key];
              return (
                <Link
                  key={`${position.key}-${batter.name}-${batter.year}`}
                  href={`/year/${batter.year}/${batter.rank}?from=team-best-nine`}
                  onClick={() => {
                    window.sessionStorage.setItem(`player-return:${batter.year}:${batter.rank}`, "history");
                  }}
                  style={{ borderLeftColor: batterColor.bg, backgroundColor: withAlpha(batterColor.bg, 0.07) }}
                  className="flex items-center gap-3 rounded-xl border border-l-[5px] border-zinc-200/70 py-3 pr-4 pl-3 transition-transform hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    style={{ backgroundColor: batterColor.bg, color: batterColor.on }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold"
                  >
                    {badge}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold text-zinc-400">{positionLabel}</span>
                    <span className="block truncate text-base font-bold tracking-tight">{batter.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span>{batter.year}年</span>
                      <span>{batter.teamName}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xl font-extrabold tabular-nums text-red-600">
                      {fmtWrcPlus(batter.wrcPlus)}
                    </span>
                    <span className="block text-[10px] font-medium text-zinc-400">wRC+</span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-400">
        規定打席到達者のうち、その球団で守備位置に就いたシーズンの最高wRC+を採用しています。外野手は上位3人です。
      </p>
    </div>
  );
}
