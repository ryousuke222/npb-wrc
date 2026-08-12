import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import type { TeamWrc } from "@/lib/wrc";
import { getAvailableYears } from "@/lib/data";
import { getLatestDashboardData } from "@/lib/latest";
import { formatGeneratedAtJa } from "@/lib/date";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { competitionRanks } from "@/lib/ranking";
import { fmtWrcPlus, wrcPlusTextColor } from "@/lib/wrc";
import TeamBadge from "./components/TeamBadge";

const DATA_PATHS = [
  { href: "/monthly", label: "月間ランキング", detail: "月ごとの好調打者" },
  { href: "/team-wrc", label: "チームwRC+", detail: "球団別の打線評価" },
  { href: "/titles", label: "打撃タイトル", detail: "年度別タイトル・ベストナイン" },
  { href: "/team-best-nine", label: "球団別ベスト9", detail: "ポジション別の歴代最高wRC+" },
  { href: "/park-factors", label: "パークファクター", detail: "年度・球団別の球場補正値" },
];

function BatterLeaders({
  leagueLabel,
  players,
}: {
  leagueLabel: string;
  players: BatterRanking[];
}) {
  const displayed = players.slice(0, 3);
  const displayRanks = competitionRanks(displayed, (player) => fmtWrcPlus(player.wrcPlus));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-zinc-900">{leagueLabel}</h3>
        <span className="text-[11px] font-medium text-zinc-500">規定打席・上位3人</span>
      </div>
      <ol className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {displayed.map((player, index) => {
          const color = teamColor(player.teamId);
          return (
            <li key={`${player.teamId}-${player.rank}`} className="border-b border-zinc-200 last:border-b-0">
              <Link
                href={`/year/${player.year}/${player.rank}?from=home`}
                style={{
                  borderLeftColor: color.bg,
                  backgroundColor: withAlpha(color.bg, 0.045),
                }}
                className="grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 border-l-4 px-3 py-2.5 transition-colors hover:bg-zinc-50 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:px-4"
              >
                <span className="text-center text-sm font-extrabold tabular-nums text-zinc-600">
                  {displayRanks[index]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-zinc-950 sm:text-base">
                    {player.name}
                  </span>
                  <TeamBadge teamId={player.teamId} name={player.teamName} className="mt-1" />
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`block text-xl font-extrabold leading-none tabular-nums sm:text-2xl ${wrcPlusTextColor(player.wrcPlus)}`}
                  >
                    {fmtWrcPlus(player.wrcPlus)}
                  </span>
                  <span className="mt-1 block text-[10px] font-medium text-zinc-500">wRC+</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TeamLeader({ year, team }: { year: number; team: TeamWrc }) {
  const color = teamColor(team.teamId);

  return (
    <Link
      href={`/year/${year}/team/${team.teamId}?source=home`}
      style={{ borderLeftColor: color.bg }}
      className="flex min-h-14 items-center justify-between gap-3 border-l-4 px-3 py-2.5 transition-colors hover:bg-zinc-50 sm:px-4"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-zinc-500">
          {team.league === "central" ? "セ・リーグ" : "パ・リーグ"}
        </span>
        <span className="mt-0.5 block truncate text-sm font-bold text-zinc-900">
          {team.teamName}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`text-xl font-extrabold tabular-nums ${wrcPlusTextColor(team.wrcPlus)}`}>
          {fmtWrcPlus(team.wrcPlus)}
        </span>
        <span className="ml-1 text-[10px] font-medium text-zinc-500">wRC+</span>
      </span>
    </Link>
  );
}

function TextLink({
  href,
  label,
  detail,
  prefetch,
}: {
  href: string;
  label: string;
  detail: string;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="group flex min-h-14 items-center justify-between gap-4 bg-white px-4 py-3 transition-colors hover:bg-zinc-50"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-zinc-900">{label}</span>
        <span className="mt-0.5 block text-xs text-zinc-500">{detail}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-900">
        →
      </span>
    </Link>
  );
}

export default async function Home() {
  const [dashboard, years] = await Promise.all([
    getLatestDashboardData(),
    getAvailableYears(),
  ]);
  const latestYear = dashboard?.year ?? years[0];
  const oldestYear = years[years.length - 1];
  const latestUpdatedAt = dashboard ? formatGeneratedAtJa(dashboard.data.generatedAt) : null;
  const teamLeaders = dashboard
    ? (["central", "pacific"] as const)
        .map((league) => dashboard.teams.find((team) => team.league === league))
        .filter((team): team is TeamWrc => Boolean(team))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <header className="border-b border-zinc-300 pb-5 sm:pb-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
              {latestYear}年 NPB打撃ランキング
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              規定打席到達者をwRC+で比較。{oldestYear}年から{latestYear}年まで、
              {years.length}シーズンの打撃成績を収録しています。
            </p>
          </div>
          <p className="text-xs font-medium text-zinc-500">
            {latestUpdatedAt ? `最終更新 ${latestUpdatedAt}` : "最新データを準備中"}
          </p>
        </div>
        <nav aria-label="主要ランキング" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
          <Link href={`/year/${latestYear}`} className="text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
            年度別ランキング
          </Link>
          <Link href="/all-time" prefetch={false} className="text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
            歴代ランキング
          </Link>
          <Link href="/latest" className="text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
            最新データ
          </Link>
        </nav>
      </header>

      {dashboard && (
        <section className="mt-7 sm:mt-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold tracking-tight text-zinc-950">現在の打者wRC+</h2>
            <Link href={`/year/${latestYear}`} className="text-xs font-bold text-zinc-600 hover:text-zinc-950">
              全打者を見る →
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <BatterLeaders leagueLabel="セ・リーグ" players={dashboard.leagueLeaders.central} />
            <BatterLeaders leagueLabel="パ・リーグ" players={dashboard.leagueLeaders.pacific} />
          </div>

          {teamLeaders.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-bold text-zinc-900">チームwRC+首位</h3>
                <Link href="/team-wrc" className="text-xs font-bold text-zinc-600 hover:text-zinc-950">
                  全球団を見る →
                </Link>
              </div>
              <div className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-zinc-200">
                {teamLeaders.map((team) => (
                  <TeamLeader key={team.teamId} year={latestYear} team={team} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mt-8 border-t border-zinc-300 pt-7 sm:mt-10 sm:pt-8">
        <h2 className="mb-3 text-base font-extrabold tracking-tight text-zinc-950">選手を調べる</h2>
        <div className="grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
          <TextLink href="/search" label="選手名から検索" detail="旧登録名にも対応" />
          <TextLink href="/compare" label="選手を比較" detail="2〜3選手の成績を並べる" />
        </div>
      </section>

      <section className="mt-7 sm:mt-8">
        <h2 className="mb-3 text-base font-extrabold tracking-tight text-zinc-950">データ一覧</h2>
        <div className="grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_PATHS.map((item) => (
            <TextLink
              key={item.href}
              {...item}
              prefetch={item.href === "/team-best-nine" ? false : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
