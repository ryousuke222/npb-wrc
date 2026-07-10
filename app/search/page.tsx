import SearchClient from "./SearchClient";

export const metadata = {
  title: "選手検索 | NPB最強打者ランキング",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">選手検索</h1>
      <p className="mt-1 text-sm text-zinc-500">
        名前で選手を検索し、直近シーズンの成績ページから年度別の推移を確認できます。
      </p>
      <div className="mt-6">
        <SearchClient />
      </div>
    </div>
  );
}
