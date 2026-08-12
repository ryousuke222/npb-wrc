export default function Loading() {
  return (
    <div
      role="status"
      aria-label="ランキングを読み込み中"
      className="mx-auto w-full max-w-6xl animate-pulse px-4 py-6 sm:px-6 sm:py-8 lg:py-10"
    >
      <span className="sr-only">ランキングを読み込んでいます。</span>
      <div className="h-4 w-28 rounded-full bg-zinc-200" />
      <div className="mt-3 h-9 w-72 max-w-full rounded-lg bg-zinc-200" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-zinc-200/80" />

      <div className="mt-7 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="h-64 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="h-4 w-20 rounded bg-zinc-200" />
          <div className="mt-5 space-y-4">
            <div className="h-10 rounded-lg bg-zinc-100" />
            <div className="h-10 rounded-lg bg-zinc-100" />
            <div className="h-10 rounded-lg bg-zinc-100" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-16 rounded-xl border border-zinc-200 bg-white" />
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex h-[4.75rem] items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3"
            >
              <div className="h-10 w-10 rounded-full bg-zinc-200" />
              <div className="flex-1">
                <div className="h-4 w-32 rounded bg-zinc-200" />
                <div className="mt-2 h-3 w-48 max-w-full rounded bg-zinc-100" />
              </div>
              <div className="h-7 w-12 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
