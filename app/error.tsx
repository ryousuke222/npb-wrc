"use client";

import Link from "next/link";

export default function ErrorPage({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-2xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-2xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-extrabold tracking-[0.14em] text-rose-600">読み込みエラー</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">
          ページを表示できませんでした
        </h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          一時的な通信エラーの可能性があります。もう一度読み込むか、別のランキングへ移動してください。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-700"
          >
            もう一度読み込む
          </button>
          <Link
            href="/"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
          >
            ホームへ戻る
          </Link>
        </div>
      </section>
    </div>
  );
}
