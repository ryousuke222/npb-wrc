import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import type { LatestDashboardData } from "@/lib/latest";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

function playerHref(batter: BatterRanking) {
  return `/year/${batter.year}/${batter.rank}`;
}

function PlayerRows({ players }: { players: BatterRanking[] }) {
  return (
    <ol className="divide-y divide-zinc-100">
      {players.map((player, index) => (
        <li key={`${player.teamId}-${player.rank}`}>
          <Link
            href={playerHref(player)}
            className="flex items-center gap-2 py-2.5 hover:bg-zinc-50"
          >
            <span className="w-5 text-center text-xs font-bold tabular-nums text-zinc-400">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">
              {player.name}
            </span>
            <span className="text-xs text-zinc-400">{player.teamName}</span>
            <span className="text-base font-extrabold tabular-nums text-zinc-950">
              {fmtWrcPlus(player.wrcPlus)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-bold tracking-tight text-zinc-900">{title}</h2>
      {note && <span className="text-[11px] text-zinc-400">{note}</span>}
    </div>
  );
}

export default function LatestDashboard({ dashboard }: { dashboard: LatestDashboardData }) {
  const { year, teams, leagueLeaders, mvpCandidates, weeklyRisers, comparisonLabel } = dashboard;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle title={`${year}年 チームwRC+ランキング`} note="打線全体・全12球団" />
        <ol className="grid gap-2 sm:grid-cols-2">
          {teams.map((team, index) => {
            const color = teamColor(team.teamId);
            return (
              <li key={team.teamId}>
                <Link
                  href={`/year/${year}/team/${team.teamId}`}
                  style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.06) }}
                  className="flex items-center gap-3 rounded-lg border border-l-4 border-zinc-200/80 px-3 py-2.5 hover:shadow-sm"
                >
                  <span className="w-5 text-center text-xs font-bold tabular-nums text-zinc-400">{index + 1}</span>
                  <span className="min-w-0 flex-1 text-sm font-bold text-zinc-800">{team.teamName}</span>
                  <span className="text-lg font-extrabold tabular-nums text-zinc-950">{fmtWrcPlus(team.wrcPlus)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="セ・リーグ 打者TOP10" note="規定打席・wRC+" />
          <PlayerRows players={leagueLeaders.central} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="パ・リーグ 打者TOP10" note="規定打席・wRC+" />
          <PlayerRows players={leagueLeaders.pacific} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="現時点のMVP候補 セ" note="打撃指標による候補" />
          <PlayerRows players={mvpCandidates.central.slice(0, 5)} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="現時点のMVP候補 パ" note="打撃指標による候補" />
          <PlayerRows players={mvpCandidates.pacific.slice(0, 5)} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <SectionTitle title="今週伸びた打者 TOP10" note={comparisonLabel ?? "週次データを蓄積中"} />
        {weeklyRisers ? (
          <ol className="divide-y divide-zinc-100">
            {weeklyRisers.map(({ batter, difference }, index) => (
              <li key={`${batter.teamId}-${batter.rank}`}>
                <Link href={playerHref(batter)} className="flex items-center gap-2 py-2.5 hover:bg-zinc-50">
                  <span className="w-5 text-center text-xs font-bold tabular-nums text-zinc-400">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">{batter.name}</span>
                  <span className="text-xs text-zinc-400">{batter.teamName}</span>
                  <span className="text-sm font-extrabold tabular-nums text-emerald-600">+{fmtWrcPlus(difference)}</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-500">
            最初の比較用データを保存しました。次回以降の更新で、約1週間前とのwRC+の変化を表示します。
          </p>
        )}
      </section>
    </div>
  );
}
