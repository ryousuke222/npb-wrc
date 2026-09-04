"use client";

import Link from "next/link";
import type { RecentBatter } from "@/lib/recent";
import { competitionRanks } from "@/lib/ranking";
import { readableOnLight, teamColor, withAlpha } from "@/lib/teamColors";
import TeamBadge from "./TeamBadge";

function rate(value: number): string {
  return value.toFixed(3).replace(/^0\./, ".");
}

export default function RecentRankingList({ rows }: { rows: RecentBatter[] }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">集計に必要な日次データを準備中です。</p>;
  }

  const displayRanks = competitionRanks(rows, (row) => rate(row.ops));

  return (
    <ol className="space-y-2">
      {rows.map((row, index) => {
        const { batter } = row;
        const color = teamColor(batter.teamId);
        return (
          <li key={`${batter.teamId}-${batter.rank}`}>
            <Link
              href={`/year/${batter.year}/${batter.rank}?from=recent`}
              prefetch={false}
              onClick={() => window.sessionStorage.setItem(`player-return:${batter.year}:${batter.rank}`, "history")}
              style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.09) }}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-l-[5px] border-zinc-200/80 px-3 py-2.5 transition-transform hover:-translate-y-px hover:shadow-sm"
            >
              <span
                style={{ backgroundColor: withAlpha(color.bg, 0.14), color: readableOnLight(color.bg) }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
              >
                {displayRanks[index]}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-bold tracking-tight text-zinc-950">{batter.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                  <TeamBadge teamId={batter.teamId} name={batter.teamName} />
                  <span>{row.games}試合・{row.pa}打席</span>
                  <span>打率 {rate(row.avg)}</span>
                  <span>{row.hr}本 {row.rbi}打点</span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-2xl font-extrabold leading-none tabular-nums text-zinc-950">{rate(row.ops)}</span>
                <span className="mt-0.5 block text-[10px] font-medium text-zinc-600">OPS</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
