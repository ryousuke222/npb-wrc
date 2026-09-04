import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import type { BatterChange, LatestDashboardData, MvpCandidate } from "@/lib/latest";
import type { TeamWrc } from "@/lib/wrc";
import { readableOnLight, teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus, wrcPlusTextColor } from "@/lib/wrc";
import { competitionRanks } from "@/lib/ranking";
import XRankingImageButton from "./XRankingImageButton";
import TeamBadge from "./TeamBadge";

function playerHref(batter: BatterRanking) {
  return `/year/${batter.year}/${batter.rank}?from=latest`;
}

function RankingNumber({ value }: { value: number }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-extrabold tabular-nums text-zinc-600 sm:h-10 sm:w-10">
      {value}
    </span>
  );
}

function PlayerRows({ players }: { players: BatterRanking[] }) {
  const displayRanks = competitionRanks(players, (player) => fmtWrcPlus(player.wrcPlus));

  return (
    <ol className="space-y-2">
      {players.map((player, index) => {
        const color = teamColor(player.teamId);
        return (
          <li key={`${player.teamId}-${player.rank}`}>
            <Link
              href={playerHref(player)}
              prefetch={false}
              style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.1) }}
              className="flex items-center gap-3 rounded-xl border border-l-[5px] border-zinc-200/80 px-3 py-2.5 transition-transform hover:-translate-y-0.5 hover:shadow-sm"
            >
              <RankingNumber value={displayRanks[index]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
                  {player.name}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <TeamBadge teamId={player.teamId} name={player.teamName} />
                  {player.titles?.map((title) => (
                    <span
                      key={title}
                      style={{
                        backgroundColor: withAlpha(color.bg, 0.23),
                        color: readableOnLight(color.bg),
                        boxShadow: `inset 0 0 0 1px ${withAlpha(color.bg, 0.32)}`,
                      }}
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                    >
                      {title}
                    </span>
                  ))}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block text-xl font-extrabold tabular-nums sm:text-2xl ${wrcPlusTextColor(player.wrcPlus)}`}>
                  {fmtWrcPlus(player.wrcPlus)}
                </span>
                <span className="block text-[10px] font-medium text-zinc-600">wRC+</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function TeamRows({ year, teams }: { year: number; teams: TeamWrc[] }) {
  const displayRanks = competitionRanks(teams, (team) => fmtWrcPlus(team.wrcPlus));

  return (
    <ol className="space-y-2">
      {teams.map((team, index) => {
        const color = teamColor(team.teamId);
        return (
          <li key={team.teamId}>
            <Link
              href={`/year/${year}/team/${team.teamId}?source=latest`}
              prefetch={false}
              style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.06) }}
              className="flex items-center gap-3 rounded-xl border border-l-[5px] border-zinc-200/80 px-3 py-2.5 transition-transform hover:-translate-y-0.5 hover:shadow-sm"
            >
              <RankingNumber value={displayRanks[index]} />
              <span className="min-w-0 flex-1 text-sm font-bold text-zinc-800">{team.teamName}</span>
              <span className="text-right">
                <span className={`block text-xl font-extrabold tabular-nums ${wrcPlusTextColor(team.wrcPlus)}`}>{fmtWrcPlus(team.wrcPlus)}</span>
                <span className="block text-[10px] font-medium text-zinc-600">wRC+</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function MvpRows({ candidates }: { candidates: MvpCandidate[] }) {
  const displayRanks = competitionRanks(candidates, ({ score }) => score.toFixed(1));

  return (
    <ol className="space-y-2">
      {candidates.map(({ batter: player, score }, index) => {
        const color = teamColor(player.teamId);
        return (
          <li key={`${player.teamId}-${player.rank}`}>
            <Link
              href={playerHref(player)}
              prefetch={false}
              style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.07) }}
              className="flex items-center gap-3 rounded-xl border border-l-[5px] border-zinc-200/80 px-3 py-2.5 transition-transform hover:-translate-y-0.5 hover:shadow-sm"
            >
              <RankingNumber value={displayRanks[index]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold tracking-tight text-zinc-900 sm:text-lg">{player.name}</span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-zinc-600 sm:text-[11px]">
                  wRC+{fmtWrcPlus(player.wrcPlus)}・{player.hr}本・{player.rbi}打点・{player.avg.toFixed(3).replace(/^0\./, ".")}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xl font-extrabold tabular-nums text-zinc-950 sm:text-2xl">{score.toFixed(1)}</span>
                <span className="block text-[10px] font-medium text-zinc-600">score</span>
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
      {note && <span className="text-[11px] text-zinc-600">{note}</span>}
    </div>
  );
}

type FocusGroupProps = {
  label: string;
  values: BatterChange[];
  format: (value: number) => string;
};

function FocusGroup({ label, values, format }: FocusGroupProps) {
  const displayed = values.slice(0, 5);
  if (displayed.length === 0) return null;

  const displayRanks = competitionRanks(displayed, (entry) => format(entry.difference));

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold tracking-tight text-zinc-900">{label}</h3>
        <span className="text-[11px] font-medium text-zinc-500">上位5人</span>
      </div>
      <ol className="space-y-2">
        {displayed.map(({ batter, difference }, index) => {
          const color = teamColor(batter.teamId);
          return (
            <li key={`${label}-${batter.teamId}-${batter.rank}`}>
              <Link
                href={playerHref(batter)}
                prefetch={false}
                style={{
                  borderLeftColor: color.bg,
                  backgroundColor: withAlpha(color.bg, 0.08),
                }}
                className="flex items-center gap-2 rounded-xl border border-l-[5px] border-zinc-200/80 px-2.5 py-2.5 transition-transform hover:-translate-y-0.5 hover:shadow-sm"
              >
                <RankingNumber value={displayRanks[index]} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold tracking-tight text-zinc-900">
                    {batter.name}
                  </span>
                  <TeamBadge
                    teamId={batter.teamId}
                    name={batter.teamName}
                    className="mt-1"
                  />
                </span>
                <span
                  style={{ color: readableOnLight(color.bg) }}
                  className="shrink-0 text-right text-base font-extrabold tabular-nums"
                >
                  {format(difference)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export default function LatestDashboard({ dashboard }: { dashboard: LatestDashboardData }) {
  const { year, teams, leagueLeaders, mvpCandidates, weeklyMovement, comparisonLabel } = dashboard;
  const centralTeams = teams.filter((team) => team.league === "central");
  const pacificTeams = teams.filter((team) => team.league === "pacific");
  const hasMovement = weeklyMovement !== null && Object.values(weeklyMovement).some((values) => values.length > 0);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <nav aria-label="最新ランキング内のメニュー" className="sticky top-[3.35rem] z-20 -mx-4 overflow-x-auto border-y border-zinc-200 bg-zinc-50/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:bg-white sm:px-3">
        <div className="flex min-w-max items-center gap-1.5">
          {[
            { href: "#today", label: "今日の注目" },
            { href: "#teams", label: "チーム" },
            { href: "#batters", label: "打者TOP10" },
            { href: "#mvp", label: "MVP候補" },
          ].map((item) => <a key={item.href} href={item.href} className="rounded-full px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950">{item.label}</a>)}
          <span className="mx-1 h-5 w-px bg-zinc-200" />
          <Link href="/recent" prefetch={false} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:border-zinc-300 hover:text-zinc-950">直近10試合 →</Link>
          <Link href={`/year/${year}`} prefetch={false} className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-700">全打者を絞り込む →</Link>
        </div>
      </nav>

      <section id="today" className="page-section">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 className="text-base font-bold tracking-tight text-zinc-900">今日の注目</h2>
              <span className="text-[11px] font-medium text-zinc-600">
                前回更新比：{comparisonLabel ?? "比較データを蓄積中"}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">数字が動いた打者を4つの切り口で表示</p>
          </div>
          <div className="flex shrink-0 gap-3 text-xs font-bold text-zinc-600">
            <Link href="/recent" prefetch={false} className="hover:text-zinc-950">直近10試合 →</Link>
            <Link href="/monthly" prefetch={false} className="hover:text-zinc-950">月間 →</Link>
          </div>
        </div>
        {weeklyMovement && hasMovement ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              { label: "wRC+急上昇", values: weeklyMovement.wrcPlus, format: (value: number) => `+${fmtWrcPlus(value)}` },
              { label: "OPS急上昇", values: weeklyMovement.ops, format: (value: number) => `+${value.toFixed(3).replace(/^0\./, ".")}` },
              { label: "本塁打を積み上げ", values: weeklyMovement.hr, format: (value: number) => `+${value}本` },
              { label: "打点を積み上げ", values: weeklyMovement.rbi, format: (value: number) => `+${value}打点` },
            ] as FocusGroupProps[]).map((group) => (
              <FocusGroup key={group.label} {...group} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-500">
            当日の試合終了後に成績が更新されると、前回更新から伸びた打者を表示します。
          </p>
        )}
      </section>

      <section id="teams" className="page-section rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title={`${year}年 チームwRC+ランキング`} note="リーグ内順位・全12球団" />
          <XRankingImageButton year={year} teams={teams} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <SectionTitle title="セ・リーグ" note="全6球団" />
            <TeamRows year={year} teams={centralTeams} />
          </div>
          <div>
            <SectionTitle title="パ・リーグ" note="全6球団" />
            <TeamRows year={year} teams={pacificTeams} />
          </div>
        </div>
      </section>

      <section id="batters" className="page-section grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="セ・リーグ 打者TOP10" note="規定打席・wRC+" />
          <PlayerRows players={leagueLeaders.central} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="パ・リーグ 打者TOP10" note="規定打席・wRC+" />
          <PlayerRows players={leagueLeaders.pacific} />
        </div>
      </section>

      <section id="mvp" className="page-section grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="打撃MVP候補 セ" note="総合スコア" />
          <MvpRows candidates={mvpCandidates.central.slice(0, 5)} />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <SectionTitle title="打撃MVP候補 パ" note="総合スコア" />
          <MvpRows candidates={mvpCandidates.pacific.slice(0, 5)} />
        </div>
      </section>

      <p className="text-xs leading-relaxed text-zinc-500">打撃MVP候補は規定打席到達者を対象に、リーグ首位を基準として wRC+ 65%・打点 12.5%・本塁打 12.5%・打率 10% で算出。守備・走塁・チーム成績は含みません。</p>
    </div>
  );
}
