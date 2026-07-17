import SearchClient from "./SearchClient";
import PageIntro from "@/app/components/PageIntro";

export const metadata = {
  title: "選手検索 | NPB最強打者ランキング",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <PageIntro
        title="選手検索"
        description="名前から探して、年度別成績の推移を確認できます。"
      />
      <div>
        <SearchClient />
      </div>
    </div>
  );
}
