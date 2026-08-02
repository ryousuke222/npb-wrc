import Link from "next/link";
import { getLatestYear } from "@/lib/data";

const MORE_PATHS = [
  { href: "/compare", label: "選手比較", detail: "2〜3選手を並べて見る" },
  { href: "/all-time", label: "歴代ランキング", detail: "最高の単年・通算成績" },
  { href: "/monthly", label: "月間ランキング", detail: "直近で成立した月の好調打者" },
  { href: "/team-wrc", label: "チームwRC+", detail: "打線全体の得点創出力" },
  { href: "/titles", label: "打撃タイトル", detail: "年度別の受賞者" },
  { href: "/team-best-nine", label: "球団別ベスト9", detail: "歴代のベストオーダー" },
];

export default async function Home() {
  const latestYear = await getLatestYear();

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:py-14">
      <section className="border-b border-zinc-200 pb-8 sm:pb-10">
        <p className="text-xs font-bold tracking-[0.18em] text-zinc-400">NPB BATTING DATABASE</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
          NPBの打撃を、
          <br className="hidden sm:block" />
          分かりやすく比べる。
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-600 sm:text-base">
          wRC+を軸に、いまの勢力図から歴代の名シーズンまで。見たい切り口からすぐにたどれます。
        </p>
      </section>

      <section className="mt-7 sm:mt-9">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-tight text-zinc-950">まず見るなら</h2>
          <span className="text-xs text-zinc-400">よく使う入口</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/latest"
            className="group rounded-2xl border border-zinc-900 bg-zinc-900 p-5 text-white transition hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-lg sm:p-6"
          >
            <p className="text-xs font-bold tracking-wider text-zinc-400">NOW</p>
            <div className="mt-7 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight">最新ランキング</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">チームwRC+、セ・パ打者TOP、今日の注目をまとめて見る。</p>
              </div>
              <span className="mb-0.5 text-2xl transition-transform group-hover:translate-x-1">→</span>
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
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-[1.15fr_0.85fr] sm:mt-9">
        <Link
          href="/search"
          className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 hover:shadow-md"
        >
          <p className="text-xs font-bold tracking-wider text-zinc-400">PLAYER</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-zinc-950">選手を名前から探す</h2>
              <p className="mt-1 text-sm text-zinc-500">旧登録名でも検索できます。</p>
            </div>
            <span className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-700 transition-colors group-hover:bg-zinc-900 group-hover:text-white">検索 →</span>
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
          <span className="text-xs text-zinc-400">データ別の入口</span>
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
                <span className="mt-0.5 block text-xs text-zinc-400">{item.detail}</span>
              </span>
              <span className="text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
