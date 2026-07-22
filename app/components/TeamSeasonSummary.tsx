import Link from "next/link";
import type { BatterRanking, YearData } from "@/lib/types";
import type { TeamId } from "@/lib/teams";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { calcTeamWrc, fmtWrcPlus } from "@/lib/wrc";
import type { BatterChange } from "@/lib/latest";

export default function TeamSeasonSummary({
  data,
  teamId,
  weeklyRisers,
}: {
  data: YearData;
  teamId: TeamId;
  weeklyRisers: BatterChange[] | null;
}) {
  const team = calcTeamWrc(data, teamId);
  if (!team) return null;
  const color = teamColor(teamId);
  const allTeams = [...new Set(data.batters.map((batter) => batter.teamId))]
    .map((id) => calcTeamWrc(data, id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.wrcPlus - a.wrcPlus);
  const teamRank = allTeams.findIndex((entry) => entry.teamId === teamId) + 1;
  const leaders = data.batters
    .filter((batter) => batter.teamId === teamId && batter.qualified)
    .sort((a, b) => b.wrcPlus - a.wrcPlus)
    .slice(0, 5);

  const playerLink = (batter: BatterRanking) => `/year/${batter.year}/${batter.rank}?from=team&teamId=${teamId}`;

  return (
    <section
      style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.06) }}
      className="mb-5 rounded-xl border border-l-4 border-zinc-200/80 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
        <div>
          <p className="text-xs font-bold text-zinc-500">チーム打線</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums text-zinc-950">{fmtWrcPlus(team.wrcPlus)}</p>
          <p className="text-[11px] text-zinc-500">リーグ平均100・全体{teamRank}位</p>
          <p className="mt-2 text-xs font-semibold text-zinc-600">
            平均比 {team.wrcPlus >= 100 ? "+" : ""}{Math.round(team.wrcPlus - 100)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-800">チーム内 打撃TOP5</h2>
            <ol className="mt-2 space-y-1.5">
              {leaders.map((batter, index) => (
                <li key={batter.rank}>
                  <Link href={playerLink(batter)} className="flex items-center gap-2 rounded-md bg-white/70 px-2 py-1.5 hover:bg-white">
                    <span className="w-4 text-center text-[10px] font-bold text-zinc-400">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-800">{batter.name}</span>
                    <span className="text-sm font-extrabold tabular-nums">{fmtWrcPlus(batter.wrcPlus)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-800">チーム内 急上昇</h2>
            {weeklyRisers ? (
              <ol className="mt-2 space-y-1.5">
                {weeklyRisers.map(({ batter, difference }, index) => (
                  <li key={batter.rank}>
                    <Link href={playerLink(batter)} className="flex items-center gap-2 rounded-md bg-white/70 px-2 py-1.5 hover:bg-white">
                      <span className="w-4 text-center text-[10px] font-bold text-zinc-400">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-800">{batter.name}</span>
                      <span className="text-sm font-extrabold tabular-nums text-emerald-600">+{fmtWrcPlus(difference)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 rounded-md bg-white/60 px-3 py-3 text-xs leading-relaxed text-zinc-500">
                週次の比較データを蓄積中です。次回以降の更新から表示します。
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
