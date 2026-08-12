export default function PlayerLoading() {
  return (
    <div
      role="status"
      aria-label="選手詳細を読み込み中"
      className="mx-auto max-w-5xl animate-pulse px-4 py-6 sm:px-6 sm:py-8"
    >
      <span className="sr-only">選手詳細を読み込んでいます。</span>
      <div className="h-4 w-40 rounded-full bg-zinc-200" />
      <section className="mt-4 rounded-2xl border border-zinc-200 border-l-8 border-l-zinc-300 bg-white p-5 sm:p-7">
        <div className="h-4 w-28 rounded bg-zinc-200" />
        <div className="mt-4 h-11 w-56 max-w-full rounded-lg bg-zinc-200" />
        <div className="mt-4 h-7 w-72 max-w-full rounded-full bg-zinc-100" />
        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 rounded-xl bg-zinc-100" />)}
        </div>
      </section>
    </div>
  );
}
