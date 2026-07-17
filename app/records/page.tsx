import Link from "next/link";
import { getAllBatters, getLatestYear } from "@/lib/data";
import type { BatterRanking } from "@/lib/types";
import { fmtRate } from "@/lib/statOptions";
import { fmtWrcPlus } from "@/lib/wrc";
import { teamColor, withAlpha } from "@/lib/teamColors";
import PageIntro from "@/app/components/PageIntro";

export const metadata = {
  title: "歴代シーズン記録 | NPB最強打者ランキング",
  description: "NPBの歴代シーズンをwRC+、本塁打、安打、打率、OPSで振り返る記録ページ。",
};

type RecordCategory = {
  label: string;
  note: string;
  getValue: (batter: BatterRanking) => number;
  format: (value: number) => string;
  qualifiedOnly?: boolean;
};

const CATEGORIES: RecordCategory[] = [
  { label: "wRC+", note: "規定打席到達者", getValue: (b) => b.wrcPlus, format: fmtWrcPlus, qualifiedOnly: true },
  { label: "本塁打", note: "シーズン記録", getValue: (b) => b.hr, format: (v) => `${v}本` },
  { label: "安打", note: "シーズン記録", getValue: (b) => b.hits, format: (v) => `${v}本` },
  { label: "打率", note: "規定打席到達者", getValue: (b) => b.avg, format: fmtRate, qualifiedOnly: true },
  { label: "OPS", note: "規定打席到達者", getValue: (b) => b.ops, format: fmtRate, qualifiedOnly: true },
];

export default async function RecordsPage() {
  const [batters, latestYear] = await Promise.all([getAllBatters(), getLatestYear()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-3xl">
      <PageIntro
        title="歴代シーズン記録"
        description="記録で振り返る、NPB打者の突出したシーズン。"
        backHref={`/year/${latestYear}`}
        backLabel="年度別ランキング"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {CATEGORIES.map((category) => {
          const ranked = batters
            .filter((b) => !category.qualifiedOnly || b.qualified)
            .sort((a, b) => category.getValue(b) - category.getValue(a))
            .slice(0, 5);

          return (
            <section key={category.label} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-bold text-zinc-900">歴代 {category.label}</h2>
                <span className="text-[11px] text-zinc-400">{category.note}</span>
              </div>
              <ol className="space-y-1.5">
                {ranked.map((batter, index) => {
                  const color = teamColor(batter.teamId);
                  return (
                    <li key={`${batter.year}-${batter.rank}`}>
                      <Link
                        href={`/year/${batter.year}/${batter.rank}?from=records`}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-50"
                      >
                        <span className="w-4 text-center text-xs font-bold tabular-nums text-zinc-400">{index + 1}</span>
                        <span
                          style={{ backgroundColor: withAlpha(color.bg, 0.15), color: color.bg }}
                          className="min-w-0 flex-1 truncate rounded px-1.5 py-0.5 text-sm font-bold"
                        >
                          {batter.name}
                        </span>
                        <span className="text-xs text-zinc-400">{batter.year}</span>
                        <span className="w-14 text-right text-sm font-extrabold tabular-nums text-zinc-900">
                          {category.format(category.getValue(batter))}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
