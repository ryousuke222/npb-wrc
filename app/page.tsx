import Link from "next/link";
import { getLatestYear } from "@/lib/data";

export default async function Home() {
  const latestYear = await getLatestYear();

  const primaryPaths = [
    {
      href: "/latest",
      eyebrow: "NOW",
      title: "いまの打撃勢力図を見る",
      body: "チームwRC+、セ・パ打者TOP、MVP候補を一度に確認。",
      accent: "border-amber-300 bg-amber-50/70",
    },
    {
      href: `/year/${latestYear}`,
      eyebrow: `${latestYear} SEASON`,
      title: "年度別ランキングを掘る",
      body: "リーグ、球団、打席数、指標を指定して全打者を比べる。",
      accent: "border-sky-300 bg-sky-50/70",
    },
    {
      href: "/all-time",
      eyebrow: "ALL TIME",
      title: "歴代の名シーズンを見る",
      body: "単年と通算のwRC+で、時代を横断して比較。",
      accent: "border-violet-300 bg-violet-50/70",
    },
    {
      href: "/compare",
      eyebrow: "COMPARE",
      title: "選手を並べて比べる",
      body: "2〜3選手のシーズン成績を同じ画面で比較。",
      accent: "border-emerald-300 bg-emerald-50/70",
    },
  ];

  const morePaths = [
    { href: "/monthly", label: "月間ランキング", detail: "今月の好調打者" },
    { href: "/titles", label: "打撃タイトル", detail: "各年度の受賞者" },
    { href: "/team-wrc", label: "チーム比較", detail: "打線全体を比較" },
    { href: "/team-best-nine", label: "球団別ベスト9", detail: "歴代ベストオーダー" },
    { href: "/search", label: "選手検索", detail: "名前から探す" },
    { href: "/watchlist", label: "ウォッチリスト", detail: "気になる選手を保存" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-10">
        <p className="text-xs font-bold tracking-[0.18em] text-zinc-400">NPB BATTING DATABASE</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
          NPBの打撃を、いま・年度・歴代で比べる。
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
          wRC+を軸に、打者の得点創出力を見やすく整理したデータベースです。まずは最新ランキングからどうぞ。
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/latest" className="rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-700">
            最新ランキングを見る →
          </Link>
          <Link href={`/year/${latestYear}`} className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50">
            {latestYear}年の全打者ランキング
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-tight text-zinc-950">目的から選ぶ</h2>
          <span className="text-xs text-zinc-400">よく使う4つの入口</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {primaryPaths.map((item) => (
            <Link key={item.href} href={item.href} className={`group rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${item.accent}`}>
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-zinc-400">{item.eyebrow}</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-zinc-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.body}</p>
                </div>
                <span className="pt-0.5 text-lg text-zinc-400 transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-extrabold tracking-tight text-zinc-950">もっと見る</h2>
          <span className="text-xs text-zinc-400">テーマ別のページ</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {morePaths.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg border border-zinc-200 px-3 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50">
              <span className="block text-sm font-bold text-zinc-800">{item.label}</span>
              <span className="mt-0.5 block text-[11px] text-zinc-400">{item.detail}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
