import Link from "next/link";
import PageIntro from "@/app/components/PageIntro";
import { getCurrentMonthRanking, type MonthlyBatter } from "@/lib/monthly";
import { teamColor, withAlpha } from "@/lib/teamColors";

function fmtRate(value: number) {
  return value.toFixed(3).replace(/^0\./, ".");
}

function Rows({ rows }: { rows: MonthlyBatter[] }) {
  return (
    <ol className="space-y-2">
      {rows.map((row, index) => {
        const color = teamColor(row.batter.teamId);
        return (
          <li key={`${row.batter.teamId}-${row.batter.rank}`}>
            <Link
              href={`/year/${row.batter.year}/${row.batter.rank}`}
              style={{
                borderLeftColor: color.bg,
                backgroundColor: withAlpha(color.bg, 0.07),
              }}
              className="flex items-center gap-3 rounded-xl border border-l-[5px] border-zinc-200/80 px-3 py-2.5 transition-transform hover:-translate-y-0.5 hover:shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-extrabold tabular-nums text-zinc-600 sm:h-10 sm:w-10">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
                  {row.batter.name}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span
                    style={{
                      backgroundColor: withAlpha(color.bg, 0.16),
                      color: color.bg,
                    }}
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  >
                    {row.batter.teamName}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400 sm:text-[11px]">
                    {row.hr}本・{row.rbi}打点・{row.pa}/{row.requiredPa}打席
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xl font-extrabold tabular-nums text-zinc-950 sm:text-2xl">
                  {fmtRate(row.ops)}
                </span>
                <span className="block text-[10px] font-medium text-zinc-400">OPS</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function LeagueSection({
  title,
  month,
  rows,
}: {
  title: string;
  month: number;
  rows: MonthlyBatter[];
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-zinc-900">{title}</h2>
        <span className="text-[11px] text-zinc-400">{month}月・月間規定打席</span>
      </div>
      <Rows rows={rows} />
    </section>
  );
}

export const metadata = {
  title: "月間ランキング | NPB最強打者ランキング",
  description: "最新月の途中経過をOPSで見るNPB打者ランキング。",
};

export default async function MonthlyPage() {
  const monthly = await getCurrentMonthRanking();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <PageIntro
        title={monthly ? `${monthly.year}年${monthly.month}月 月間ランキング` : "月間ランキング"}
        description="今月の打撃成績をOPSでランキング。各球団の月間試合数 × 3.1打席を満たした打者のみ表示します。"
        meta={
          monthly
            ? `集計期間：${monthly.label}・球団ごとの月間規定打席以上`
            : "月間比較データを蓄積中"
        }
      />

      {monthly ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <LeagueSection title="セ・リーグ 月間OPS TOP10" month={monthly.month} rows={monthly.central} />
          <LeagueSection title="パ・リーグ 月間OPS TOP10" month={monthly.month} rows={monthly.pacific} />
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-500">
          月の最初と最新のデータがそろうと、月間ランキングを表示します。
        </div>
      )}
    </div>
  );
}
