import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import { readableOnLight, teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

function fmtRate(value: number) { return value.toFixed(3).replace(/^0\./, "."); }
function href(batter: BatterRanking) { return `/year/${batter.year}/${batter.rank}`; }

export default function PlayerInsights({ batter, history, similar, teamRank, leagueRank }: { batter: BatterRanking; history: BatterRanking[]; similar: BatterRanking[]; teamRank: number | null; leagueRank: number | null }) {
  const qualified = history.filter((entry) => entry.qualified);
  const bestWrc = qualified.reduce((best, entry) => !best || entry.wrcPlus > best.wrcPlus ? entry : best, null as BatterRanking | null);
  const bestOps = qualified.reduce((best, entry) => !best || entry.ops > best.ops ? entry : best, null as BatterRanking | null);
  const maxHr = history.reduce((best, entry) => !best || entry.hr > best.hr ? entry : best, null as BatterRanking | null);
  const bestAvg = qualified.reduce((best, entry) => !best || entry.avg > best.avg ? entry : best, null as BatterRanking | null);
  const total = history.reduce((sum, entry) => ({
    pa: sum.pa + entry.pa,
    ab: sum.ab + entry.ab,
    hits: sum.hits + entry.hits,
    hr: sum.hr + entry.hr,
    doubles: sum.doubles + entry.doubles,
    triples: sum.triples + entry.triples,
    bb: sum.bb + entry.bb,
    hbp: sum.hbp + entry.hbp,
    sf: sum.sf + entry.sf,
    weightedWrc: sum.weightedWrc + entry.wrcPlus * entry.pa,
  }), {
    pa: 0,
    ab: 0,
    hits: 0,
    hr: 0,
    doubles: 0,
    triples: 0,
    bb: 0,
    hbp: 0,
    sf: 0,
    weightedWrc: 0,
  });
  const firstYear = Math.min(...history.map((entry) => entry.year));
  const lastYear = Math.max(...history.map((entry) => entry.year));
  const careerYears = new Set(history.map((entry) => entry.year)).size;
  const totalBases = total.hits + total.doubles + total.triples * 2 + total.hr * 3;
  const careerObpDenom = total.ab + total.bb + total.hbp + total.sf;
  const careerOps = total.ab > 0 && careerObpDenom > 0
    ? (total.hits + total.bb + total.hbp) / careerObpDenom + totalBases / total.ab
    : null;
  const titlesByYear = Array.from(
    history.reduce((grouped, entry) => {
      const titles = (entry.titles ?? []).filter((title) => title !== "—");
      if (titles.length === 0) return grouped;
      const current = grouped.get(entry.year);
      if (current) {
        titles.forEach((title) => current.titles.add(title));
      } else {
        grouped.set(entry.year, { entry, titles: new Set(titles) });
      }
      return grouped;
    }, new Map<number, { entry: BatterRanking; titles: Set<string> }>()).values()
  )
    .map(({ entry, titles }) => ({ entry, titles: Array.from(titles) }))
    .sort((a, b) => b.entry.year - a.entry.year);
  const color = teamColor(batter.teamId);
  const accent = readableOnLight(color.bg);
  const highlights = [
    { label: "最高wRC+", season: bestWrc, value: bestWrc ? fmtWrcPlus(bestWrc.wrcPlus) : "—" },
    { label: "最高OPS", season: bestOps, value: bestOps ? fmtRate(bestOps.ops) : "—" },
    { label: "最多本塁打", season: maxHr, value: maxHr ? `${maxHr.hr}本` : "—" },
    { label: "最高打率", season: bestAvg, value: bestAvg ? fmtRate(bestAvg.avg) : "—" },
  ];
  return <div className="mt-6 space-y-6">
    <section
      style={{
        borderLeftColor: color.bg,
        backgroundImage: `linear-gradient(135deg, ${withAlpha(color.bg, 0.12)}, transparent 58%)`,
      }}
      className="overflow-hidden rounded-2xl border border-l-[6px] border-zinc-200 bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400">シーズン評価</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight">この年の立ち位置</h2>
        </div>
        <span
          style={{ backgroundColor: withAlpha(color.bg, 0.14), color: accent }}
          className="rounded-full px-3 py-1 text-xs font-bold"
        >
          {batter.age ? `${batter.age}歳シーズン` : `${batter.year}年`}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div
          style={{
            backgroundColor: withAlpha(color.bg, 0.13),
            color: accent,
            boxShadow: `inset 0 0 0 1px ${withAlpha(color.bg, 0.22)}`,
          }}
          className="col-span-2 rounded-2xl p-4 sm:col-span-1"
        >
          <div className="text-[10px] font-bold tracking-wide opacity-70">リーグ wRC+</div>
          <div className="mt-2 flex items-end gap-1">
            <span className="text-4xl font-black tabular-nums">{leagueRank ? leagueRank : "—"}</span>
            <span className="pb-1 text-xs font-bold opacity-70">{leagueRank ? "位" : "参考"}</span>
          </div>
        </div>
        {[
          { label: "チーム内 wRC+", value: teamRank ? `${teamRank}位` : "参考" },
          { label: "リーグ平均との差", value: `${batter.wrcPlus >= 100 ? "+" : ""}${Math.round(batter.wrcPlus - 100)}` },
          { label: "主なポジション", value: batter.position ?? "—" },
        ].map((item) => (
          <div key={item.label} className="flex min-h-24 flex-col justify-between rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="text-[10px] font-bold tracking-wide text-zinc-400">{item.label}</div>
            <div className="mt-3 text-xl font-black tabular-nums text-zinc-900">{item.value}</div>
          </div>
        ))}
      </div>
    </section>

    <section
      style={{
        borderLeftColor: color.bg,
        backgroundImage: `linear-gradient(135deg, ${withAlpha(color.bg, 0.09)}, white 42%)`,
      }}
      className="overflow-hidden rounded-2xl border border-l-[6px] border-zinc-200 bg-white shadow-sm"
    >
      <div className="grid sm:grid-cols-[1.05fr_1.45fr]">
        <div className="border-b border-zinc-200 p-5 sm:border-r sm:border-b-0 sm:p-6">
          <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-400">通算成績</p>
          <h2 className="mt-1 text-lg font-extrabold text-zinc-950">キャリア要約</h2>
          <p className="mt-1 text-xs text-zinc-500">{firstYear}–{lastYear}・{careerYears}シーズン</p>
          <div className="mt-6">
            <div className="text-[11px] font-bold text-zinc-500">通算 wRC+</div>
            <div style={{ color: accent }} className="mt-1 text-5xl font-black tabular-nums tracking-tight">
              {total.pa ? fmtWrcPlus(total.weightedWrc / total.pa) : "—"}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">年度別wRC+を打席数で加重平均</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-zinc-200">
          {[
            { label: "通算安打", value: total.hits.toLocaleString("ja-JP"), unit: "H" },
            { label: "通算本塁打", value: total.hr.toLocaleString("ja-JP"), unit: "HR" },
            { label: "通算打率", value: total.ab ? fmtRate(total.hits / total.ab) : "—", unit: "AVG" },
            { label: "通算OPS", value: careerOps !== null ? fmtRate(careerOps) : "—", unit: "OPS" },
          ].map((item) => (
            <div key={item.label} className="bg-white p-5 sm:p-6">
              <div className="text-[10px] font-bold tracking-wide text-zinc-400">{item.label}</div>
              <div className="mt-3 text-3xl font-black tabular-nums tracking-tight text-zinc-950">{item.value}</div>
              <div className="mt-1 text-[9px] font-bold tracking-[0.16em] text-zinc-400">{item.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section
      style={{
        borderLeftColor: color.bg,
        backgroundImage: `linear-gradient(135deg, ${withAlpha(color.bg, 0.1)}, white 54%)`,
      }}
      className="rounded-2xl border border-l-[6px] border-zinc-200 bg-white p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p style={{ color: accent }} className="text-[10px] font-bold tracking-[0.14em]">自己最高記録</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight">キャリアハイ</h2>
        </div>
        <span
          style={{ backgroundColor: withAlpha(color.bg, 0.12), color: accent }}
          className="rounded-full px-3 py-1 text-[10px] font-bold"
        >
          キャリアベスト
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {highlights.map(({ label, season, value }) => {
          const seasonColor = season ? teamColor(season.teamId) : color;
          return (
            <Link
              key={label}
              href={season ? href(season) : "#"}
              style={{
                borderTopColor: seasonColor.bg,
                backgroundImage: `linear-gradient(145deg, ${withAlpha(seasonColor.bg, 0.1)}, white 58%)`,
              }}
              className="group relative overflow-hidden rounded-2xl border border-t-4 border-zinc-200 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-[10px] font-bold tracking-wide text-zinc-400">{label}</div>
              <div className="mt-3 text-3xl font-black tabular-nums tracking-tight text-zinc-950">{value}</div>
              {season && (
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-200/70 pt-3">
                  <span className="text-xs font-extrabold text-zinc-700">{season.year}年</span>
                  <span className="text-[10px] font-semibold text-zinc-400">{season.age ? `${season.age}歳` : season.teamName}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>

    {(titlesByYear.length > 0 || similar.length > 0) && (
      <section className="grid gap-4 lg:grid-cols-2">
        <div
          style={{ borderTopColor: color.bg }}
          className="rounded-2xl border border-t-4 border-zinc-200 bg-white p-5"
        >
          <h2 className="text-base font-extrabold">タイトル・ベストナイン</h2>
          <p className="mt-1 text-[11px] text-zinc-400">年度ごとに獲得タイトルを表示</p>
          {titlesByYear.length ? (
            <ol className="mt-4 space-y-2">
              {titlesByYear.map(({ entry, titles }) => {
                const entryColor = teamColor(entry.teamId);
                const entryAccent = readableOnLight(entryColor.bg);
                return (
                  <li key={entry.year}>
                    <Link
                      href={href(entry)}
                      style={{
                        borderLeftColor: entryColor.bg,
                        backgroundColor: withAlpha(entryColor.bg, 0.06),
                      }}
                      className="flex items-start gap-3 rounded-xl border border-l-4 border-zinc-200 px-3 py-3 transition hover:-translate-y-px"
                    >
                      <span className="shrink-0 pt-0.5 text-sm font-extrabold text-zinc-700">
                        {entry.year}年
                      </span>
                      <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        {titles.map((title) => (
                          <span
                            key={title}
                            style={{
                              backgroundColor: withAlpha(entryColor.bg, 0.15),
                              color: entryAccent,
                            }}
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                          >
                            {title}
                          </span>
                        ))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">記録なし</p>
          )}
        </div>

        <div
          style={{ borderTopColor: color.bg }}
          className="rounded-2xl border border-t-4 border-zinc-200 bg-white p-5"
        >
          <h2 className="text-base font-extrabold">似たシーズン</h2>
          <p className="mt-1 text-[11px] text-zinc-400">
            wRC+・OPS・本塁打・打席数から近い年度を抽出
          </p>
          <ol className="mt-4 space-y-1.5">
            {similar.map((entry) => (
              <li key={`${entry.year}-${entry.rank}`}>
                <Link
                  href={href(entry)}
                  style={{
                    borderLeftColor: teamColor(entry.teamId).bg,
                    backgroundColor: withAlpha(teamColor(entry.teamId).bg, 0.04),
                  }}
                  className="flex items-center gap-2 rounded-lg border border-l-4 border-zinc-200 px-2.5 py-2 transition hover:-translate-y-px"
                >
                  <span className="text-xs font-bold text-zinc-500">{entry.year}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.name}</span>
                  <span className="text-sm font-extrabold">{fmtWrcPlus(entry.wrcPlus)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>
    )}
  </div>;
}
