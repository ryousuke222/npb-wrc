import Link from "next/link";
import { getLatestYear } from "@/lib/data";
import { getLatestDashboardData } from "@/lib/latest";
import { formatGeneratedAtJa } from "@/lib/date";
import { readableOnLight, teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

const MORE_PATHS = [
  { href: "/monthly", label: "月間ランキング", detail: "直近で成立した月の好調打者" },
  { href: "/team-wrc", label: "チームwRC+", detail: "打線全体の得点創出力" },
  { href: "/titles", label: "打撃タイトル", detail: "年度別の受賞者" },
  { href: "/team-best-nine", label: "球団別ベスト9", detail: "歴代のベストオーダー" },
  { href: "/records", label: "記録", detail: "単年・通算の上位記録" },
  { href: "/park-factors", label: "パークファクター", detail: "球場補正値を確認" },
];

export default async function Home() {
  const dashboard = await getLatestDashboardData();
  const latestYear = dashboard?.year ?? await getLatestYear();
  const latestUpdatedAt = dashboard ? formatGeneratedAtJa(dashboard.data.generatedAt) : null;
  const liveItems = dashboard ? [
    ...(["central", "pacific"] as const).flatMap((league) => {
      const batter = dashboard.leagueLeaders[league][0];
      return batter ? [{
        href: `/year/${batter.year}/${batter.rank}?from=home`,
        eyebrow: league === "central" ? "セ・打者1位" : "パ・打者1位",
        name: batter.name,
        value: fmtWrcPlus(batter.wrcPlus),
        unit: "wRC+",
        color: teamColor(batter.teamId).bg,
      }] : [];
    }),
    ...(["central", "pacific"] as const).flatMap((league) => {
      const team = dashboard.teams.find((entry) => entry.league === league);
      return team ? [{
        href: `/year/${dashboard.year}/team/${team.teamId}`,
        eyebrow: league === "central" ? "セ・チーム1位" : "パ・チーム1位",
        name: team.teamName,
        value: fmtWrcPlus(team.wrcPlus),
        unit: "wRC+",
        color: teamColor(team.teamId).bg,
      }] : [];
    }),
  ] : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
      <section className="border-b border-zinc-200 pb-8 sm:pb-10">
        <p className="text-xs font-bold tracking-[0.18em] text-zinc-500">NPB BATTING DATABASE</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
          NPBの打撃を、
          <br className="hidden sm:block" />
          分かりやすく比べる。
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600 sm:text-base">
          wRC+を軸に、いまの勢力図から歴代の名シーズンまで。見たい切り口からすぐにたどれます。
        </p>
      </section>

      {liveItems.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white sm:mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 sm:px-5">
            <div>
              <p className="text-sm font-extrabold tracking-tight text-zinc-900">{latestYear}年 現在のトップ</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">セ・パの打者とチームを一目で確認</p>
            </div>
            <p className="text-[11px] font-medium text-zinc-500">{latestUpdatedAt ? `更新 ${latestUpdatedAt}` : "更新準備中"}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {liveItems.map((item) => (
              <Link key={item.eyebrow} href={item.href} className="group border-b border-r border-zinc-100 p-4 transition-colors hover:bg-zinc-50 lg:border-b-0">
                <span style={{ color: readableOnLight(item.color) }} className="text-[10px] font-extrabold tracking-wide">{item.eyebrow}</span>
                <span className="mt-2 flex items-end justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-bold text-zinc-800">{item.name}</span>
                  <span style={{ backgroundColor: withAlpha(item.color, 0.12), color: readableOnLight(item.color) }} className="shrink-0 rounded-lg px-2 py-1 text-base font-extrabold tabular-nums">{item.value}<span className="ml-0.5 text-[9px]">{item.unit}</span></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-7 sm:mt-9">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-tight text-zinc-950">まず見るなら</h2>
          <span className="text-xs text-zinc-500">よく使う入口</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/latest"
            className="group rounded-2xl border border-amber-200 bg-amber-50 p-5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg sm:p-6"
          >
            <p className="text-xs font-bold tracking-wider text-amber-700">NOW</p>
            <div className="mt-7 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-zinc-900">最新ランキング</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">チームwRC+、セ・パ打者TOP、今日の注目をまとめて見る。</p>
              </div>
              <span className="mb-0.5 text-2xl text-amber-700 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
          <Link
            href={`/year/${latestYear}`}
            className="group rounded-2xl border border-sky-200 bg-sky-50 p-5 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg sm:p-6"
          >
            <p className="text-xs font-bold tracking-wider text-sky-600">{latestYear} SEASON</p>
            <div className="mt-7 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-zinc-900">年度別ランキング</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">球団・リーグ・打席数・指標で、全打者を絞り込む。</p>
              </div>
              <span className="mb-0.5 text-2xl text-sky-600 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
          <Link
            href="/all-time"
            className="group rounded-2xl border border-violet-200 bg-violet-50 p-5 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg sm:p-6"
          >
            <p className="text-xs font-bold tracking-wider text-violet-600">ALL-TIME</p>
            <div className="mt-7 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-zinc-900">歴代ランキング</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">名シーズンと通算wRC+を、時代をまたいで比べる。</p>
              </div>
              <span className="mb-0.5 text-2xl text-violet-600 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-[1.15fr_0.85fr] sm:mt-9">
        <Link
          href="/search"
          className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 hover:shadow-md"
        >
          <p className="text-xs font-bold tracking-wider text-zinc-500">PLAYER</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-zinc-950">選手を名前から探す</h2>
              <p className="mt-1 text-sm text-zinc-500">旧登録名でも検索できます。</p>
            </div>
            <span className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-700 transition-colors group-hover:bg-zinc-200">検索 →</span>
          </div>
        </Link>
        <Link
          href="/compare"
          className="group rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <p className="text-xs font-bold tracking-wider text-emerald-600">COMPARE</p>
          <h2 className="mt-4 text-lg font-extrabold tracking-tight text-zinc-900">2〜3選手を比較</h2>
          <p className="mt-1 text-sm text-zinc-600">時代をまたいで成績を並べる。</p>
        </Link>
      </section>

      <section className="mt-7 sm:mt-9">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-extrabold tracking-tight text-zinc-950">テーマから見る</h2>
          <span className="text-xs text-zinc-500">データ別の入口</span>
        </div>
        <div className="grid divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3 lg:divide-x">
          {MORE_PATHS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50"
            >
              <span>
                <span className="block text-sm font-bold text-zinc-800">{item.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{item.detail}</span>
              </span>
              <span className="text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
