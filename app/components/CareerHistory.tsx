import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

function fmtRate(n: number): string {
  return n.toFixed(3).replace(/^0\./, ".");
}

function wrcTextColor(v: number): string {
  if (v >= 160) return "text-red-600";
  if (v >= 130) return "text-orange-600";
  if (v >= 100) return "text-zinc-900";
  return "text-zinc-500";
}

export default function CareerHistory({
  history,
  currentYear,
}: {
  history: BatterRanking[];
  currentYear: number;
}) {
  if (history.length <= 1) return null;

  // 1打席だけの年などwRC+が極端な値（数百）になりうるため、選手自身の最大値ではなく
  // 固定スケールを使う（そうしないと1シーズンの外れ値に他の全シーズンの棒グラフが
  // 潰されてしまう）。250はエリート級シーズン（wRC+160〜200前後）にも十分な余白を持たせた値。
  const CHART_MAX_WRC = 250;

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <h2 className="text-sm font-bold text-zinc-500">年度別成績の推移</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-400">
              <th className="py-1.5 pr-3 font-medium">年度</th>
              <th className="py-1.5 pr-3 font-medium">球団</th>
              <th className="py-1.5 pr-3 text-right font-medium">打席</th>
              <th className="py-1.5 pr-3 text-right font-medium">打率</th>
              <th className="py-1.5 pr-3 text-right font-medium">本塁打</th>
              <th className="py-1.5 pr-3 font-medium">wRC+</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => {
              const isCurrent = h.year === currentYear;
              const color = teamColor(h.teamId);
              const barWidth = Math.max(
                0,
                Math.min(100, (h.wrcPlus / CHART_MAX_WRC) * 100)
              );
              return (
                <tr
                  key={`${h.year}-${h.teamId}-${h.rank}`}
                  className={`border-t border-zinc-100 ${isCurrent ? "bg-zinc-50" : ""}`}
                >
                  <td className="py-2.5 pr-3 font-bold">
                    <Link
                      href={`/year/${h.year}/${h.rank}`}
                      className="hover:underline"
                    >
                      {h.year}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      style={{
                        backgroundColor: withAlpha(color.bg, 0.16),
                        color: color.bg,
                      }}
                      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap"
                    >
                      {h.teamName}
                    </span>
                    {!h.qualified && (
                      <span className="ml-1 text-[11px] text-zinc-400">
                        規定未満
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600">
                    {h.pa}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600">
                    {fmtRate(h.avg)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-zinc-600">
                    {h.hr}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-100 sm:w-24">
                        <div
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: color.bg,
                          }}
                          className="h-full rounded-full"
                        />
                      </div>
                      <span
                        className={`font-bold tabular-nums ${wrcTextColor(h.wrcPlus)}`}
                      >
                        {fmtWrcPlus(h.wrcPlus)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
