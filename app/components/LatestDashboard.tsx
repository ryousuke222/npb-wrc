import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import type { LatestDashboardData, MvpCandidate } from "@/lib/latest";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";
import XRankingImageButton from "./XRankingImageButton";

function playerHref(batter: BatterRanking) {
  return `/year/${batter.year}/${batter.rank}`;
}

function PlayerRows({ players }: { players: BatterRanking[] }) {
  return (
    <ol className="space-y-1.5">
      {players.map((player, index) => {
        const color = teamColor(player.teamId);
        return (
          <li key={`${player.teamId}-${player.rank}`}>
            <Link
              href={playerHref(player)}
              style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.07) }}
              className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200/80 px-2.5 py-2 transition-shadow hover:shadow-sm"
            >
              <span className="w-5 text-center text-xs font-bold tabular-nums text-zinc-400">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">
                {player.name}
              </span>
              <span className="shrink-0 text-[11px] text-zinc-400">{player.teamName}</span>
              <span className="text-base font-extrabold tabular-nums text-zinc-950">
                {fmtWrcPlus(player.wrcPlus)}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function MvpRows({ candidates }: { candidates: MvpCandidate[] }) {
  return (
    <ol className="space-y-1.5">
      {candidates.map(({ batter: player, score }, index) => {
        const color = teamColor(player.teamId);
        return (
          <li key={`${player.teamId}-${player.rank}`}>
            <Link
              href={playerHref(player)}
              style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.07) }}
              className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200/80 px-2.5 py-2 transition-shadow hover:shadow-sm"
            >
              <span className="w-5 text-center text-xs font-bold tabular-nums text-zinc-400">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">{player.name}</span>
              <span className="hidden shrink-0 text-[11px] text-zinc-400 sm:inline">
                wRC+{fmtWrcPlus(player.wrcPlus)}・{player.hr}本・{player.rbi}打点・{player.avg.toFixed(3).replace(/^0\./, ".")}
              </span>
              <span className="shrink-0 text-base font-extrabold tabular-nums text-zinc-950">
                {score.toFixed(1)}
              </span>
            </Link>
          </li>
        );
      })}
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
  const { year, teams, leagueLeaders, mvpCandidates, weeklyMovement, comparisonLabel } = dashboard;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title={`${year}年 チームwRC+ランキング`} note="打線全体・全12球団" />
          <XRankingImageButton year={year} teams={teams} />
        </div>
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
          <SectionTitle title="打撃MVP候補 セ" note="総合スコア" />
          <MvpRows candidates={mvpCandidates.central.slice(0, 5)} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="打撃MVP候補 パ" note="総合スコア" />
          <MvpRows candidates={mvpCandidates.pacific.slice(0, 5)} />
        </div>
      </section>

      <p className="-mt-3 text-xs leading-relaxed text-zinc-500">
        打撃MVP候補は規定打席到達者を対象に、リーグ首位を基準として wRC+ 65%・打点 12.5%・本塁打 12.5%・打率 10% で算出。
        守備・走塁・チーム成績は含みません。
      </p>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <SectionTitle title="今日の注目" note={comparisonLabel ?? "比較データを蓄積中"} />
          <Link href="/monthly" className="shrink-0 text-xs font-bold text-zinc-600 hover:text-zinc-950">月間ランキング →</Link>
        </div>
        {weeklyMovement ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "wRC+急上昇", values: weeklyMovement.wrcPlus, format: (value: number) => `+${fmtWrcPlus(value)}` },
              { label: "OPS急上昇", values: weeklyMovement.ops, format: (value: number) => `+${value.toFixed(3).replace(/^0\./, ".")}` },
              { label: "本塁打を積み上げ", values: weeklyMovement.hr, format: (value: number) => `+${value}本` },
              { label: "出場量", values: weeklyMovement.pa, format: (value: number) => `+${value}打席` },
            ].map((group) => (
              <div key={group.label}>
                <h3 className="mb-1.5 text-xs font-bold text-zinc-500">{group.label}</h3>
                <ol className="space-y-1.5">
                  {group.values.slice(0, 5).map(({ batter, difference }, index) => (
                    <li key={`${group.label}-${batter.teamId}-${batter.rank}`}>
                      <Link
                        href={playerHref(batter)}
                        className="flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-1.5 hover:bg-zinc-100"
                      >
                        <span className="w-4 text-center text-[10px] font-bold text-zinc-400">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-800">{batter.name}</span>
                        <span className="text-xs font-extrabold tabular-nums text-emerald-600">{group.format(difference)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-500">
            次回のデータ更新後、前回更新から伸びた打者を表示します。
          </p>
        )}
      </section>
    </div>
  );
}
