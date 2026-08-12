export default function TeamLoading() {
  return (
    <div role="status" aria-label="チーム詳細を読み込み中" className="mx-auto max-w-6xl animate-pulse px-4 py-6 sm:px-6 sm:py-8">
      <span className="sr-only">チーム詳細を読み込んでいます。</span>
      <div className="h-4 w-36 rounded-full bg-zinc-200" />
      <div className="mt-4 h-36 rounded-2xl border border-zinc-200 bg-white" />
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-[4.5rem] rounded-xl border border-zinc-200 bg-white" />)}
      </div>
    </div>
  );
}
