import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAvailableYears, getYearData } from "@/lib/data";
import {
  ALL_TEAM_IDS,
  HISTORICAL_ONLY_TEAM_IDS,
  TEAM_ID_DEFAULT_NAME,
  type TeamId,
} from "@/lib/teams";
import RankingView from "@/app/components/RankingView";
import TeamBackLink from "@/app/components/TeamBackLink";

const TARGET_TEAM_IDS: TeamId[] = [...ALL_TEAM_IDS, ...HISTORICAL_ONLY_TEAM_IDS];

export async function generateStaticParams() {
  const years = await getAvailableYears();
  const params: { year: string; teamId: string }[] = [];
  for (const year of years) {
    const data = await getYearData(year);
    if (!data) continue;
    const teamsInYear = new Set(data.batters.map((b) => b.teamId));
    for (const teamId of teamsInYear) {
      params.push({ year: String(year), teamId });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; teamId: string }>;
}): Promise<Metadata> {
  const { year: yearParam, teamId } = await params;
  const year = Number(yearParam);
  const teamName = TEAM_ID_DEFAULT_NAME[teamId as TeamId] ?? teamId;
  return {
    title: `${year}年 ${teamName} 選手一覧(wRC+) | NPB最強打者ランキング`,
    description: `${year}年シーズンの${teamName}に在籍した打者をwRC+でランキング。`,
  };
}

export default async function YearTeamPage({
  params,
}: {
  params: Promise<{ year: string; teamId: string }>;
}) {
  const { year: yearParam, teamId: teamIdParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) notFound();
  if (!TARGET_TEAM_IDS.includes(teamIdParam as TeamId)) notFound();
  const teamId = teamIdParam as TeamId;

  const data = await getYearData(year);
  if (!data) notFound();

  const teamBatters = data.batters.filter((b) => b.teamId === teamId);
  if (teamBatters.length === 0) notFound();

  const teamName = teamBatters[0].teamName;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Suspense fallback={<span className="text-sm text-zinc-400">&nbsp;</span>}>
        <TeamBackLink />
      </Suspense>

      <div className="mb-6 mt-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {year}年 {teamName} 選手一覧
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          wRC+（簡易版）による{teamName}在籍打者のランキング（打席数の条件は変更できます）
        </p>
      </div>

      <RankingView
        batters={teamBatters}
        regulationPaThreshold={data.regulationPaThreshold}
        initialScope="all"
        initialMinPa={200}
        hideScopeFilter
        playerBackQuery={`from=team&teamId=${teamId}`}
      />
    </div>
  );
}
