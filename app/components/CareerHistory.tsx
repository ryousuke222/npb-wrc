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
  // 潰されてしまう）。200はエリート級シーズン（wRC+160〜200前後）が満杯近くまで伸びる値。
  const CHART_MAX_WRC = 200;
  const graphMin = 50;
  const graphMax = Math.max(CHART_MAX_WRC, ...history.map((entry) => Math.ceil(entry.wrcPlus / 10) * 10));
  const graphWidth = 600;
  const graphHeight = 150;
  const graphPadding = { left: 28, right: 12, top: 12, bottom: 24 };
  const pointFor = (entry: BatterRanking, index: number) => {
    const x = graphPadding.left + (history.length === 1 ? 0 : index / (history.length - 1)) * (graphWidth - graphPadding.left - graphPadding.right);
    const clamped = Math.max(graphMin, Math.min(graphMax, entry.wrcPlus));
    const y = graphPadding.top + (1 - (clamped - graphMin) / (graphMax - graphMin)) * (graphHeight - graphPadding.top - graphPadding.bottom);
    return { x, y };
  };
  const graphPoints = history.map(pointFor);

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <h2 className="text-sm font-bold text-zinc-500">年度別成績の推移</h2>
      <div className="mt-4 rounded-xl bg-zinc-50 px-2 py-3 sm:px-4">
        <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400"><span>wRC+</span><span>年度推移</span></div>
        <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} role="img" aria-label="年度別wRC+推移" className="h-36 w-full overflow-visible">
          {[100, 150, 200].filter((value) => value <= graphMax).map((value) => {
            const y = graphPadding.top + (1 - (value - graphMin) / (graphMax - graphMin)) * (graphHeight - graphPadding.top - graphPadding.bottom);
            return <g key={value}><line x1={graphPadding.left} x2={graphWidth - graphPadding.right} y1={y} y2={y} stroke="#e4e4e7" strokeDasharray="3 3" /><text x="0" y={y + 4} fill="#a1a1aa" fontSize="10">{value}</text></g>;
          })}
          <polyline points={graphPoints.map(({ x, y }) => `${x},${y}`).join(" ")} fill="none" stroke="#18181b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {history.map((entry, index) => {
            const point = graphPoints[index];
            const color = teamColor(entry.teamId);
            return <g key={`${entry.year}-${entry.teamId}-${entry.rank}`}><title>{`${entry.year}年 ${entry.teamName} wRC+ ${fmtWrcPlus(entry.wrcPlus)}`}</title><circle cx={point.x} cy={point.y} r="4" fill={color.bg} stroke="white" strokeWidth="2" /><text x={point.x} y={graphHeight - 5} textAnchor="middle" fill="#71717a" fontSize="10">{String(entry.year).slice(2)}</text></g>;
          })}
        </svg>
      </div>

      {/* モバイル幅では列数の多いテーブルが横スクロール必須になるため、
          年度ごとのカード積み重ねに切り替える（PC幅はテーブル表示） */}
      <div className="mt-4 flex flex-col sm:hidden">
        {history.map((h) => {
          const isCurrent = h.year === currentYear;
          const color = teamColor(h.teamId);
          const barWidth = Math.max(
            0,
            Math.min(100, (h.wrcPlus / CHART_MAX_WRC) * 100)
          );
          return (
            <Link
              key={`${h.year}-${h.teamId}-${h.rank}`}
              href={`/year/${h.year}/${h.rank}`}
              className={`flex flex-col gap-1.5 border-t border-zinc-100 py-3 first:border-t-0 ${isCurrent ? "bg-zinc-50" : ""}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="font-bold">{h.year}</span>
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
                    <span className="text-[10px] whitespace-nowrap text-zinc-400">
                      規定未満
                    </span>
                  )}
                </div>
                <span
                  className={`shrink-0 text-lg font-extrabold tabular-nums ${wrcTextColor(h.wrcPlus)}`}
                >
                  {fmtWrcPlus(h.wrcPlus)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color.bg,
                    }}
                    className="h-full rounded-full"
                  />
                </div>
                <span className="shrink-0 text-[10px] text-zinc-400">wRC+</span>
              </div>
              <div className="truncate text-xs tabular-nums text-zinc-500">
                {h.pa}打席 {fmtRate(h.avg)} {h.hr}本 OPS{fmtRate(h.ops)}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-center text-xs text-zinc-400">
              <th className="py-1.5 px-2 font-medium">年度</th>
              <th className="py-1.5 px-2 font-medium">球団</th>
              <th className="py-1.5 px-2 font-medium">打席</th>
              <th className="py-1.5 px-2 font-medium">打率</th>
              <th className="py-1.5 px-2 font-medium">本塁打</th>
              <th className="py-1.5 px-2 font-medium">OPS</th>
              <th className="py-1.5 px-2 font-medium">wRC+</th>
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
                  <td className="py-2.5 px-2 text-center font-bold">
                    <Link
                      href={`/year/${h.year}/${h.rank}`}
                      className="hover:underline"
                    >
                      {h.year}
                    </Link>
                  </td>
                  <td className="py-2.5 px-2 text-center">
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
                  <td className="py-2.5 px-2 text-center tabular-nums text-zinc-600">
                    {h.pa}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-zinc-600">
                    {fmtRate(h.avg)}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-zinc-600">
                    {h.hr}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums text-zinc-600">
                    {fmtRate(h.ops)}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center justify-center gap-2">
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
