import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-2xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-extrabold tracking-[0.14em] text-sky-700">404</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">
          ページが見つかりません
        </h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          URLが変わったか、対象の年度・選手データが存在しない可能性があります。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/latest" className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-700">
            最新ランキングを見る
          </Link>
          <Link href="/search" className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
            選手を検索する
          </Link>
          <Link href="/" className="rounded-lg px-4 py-2.5 text-sm font-bold text-zinc-600 hover:bg-zinc-100">
            ホームへ戻る
          </Link>
        </div>
      </section>
    </div>
  );
}
