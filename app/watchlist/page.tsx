import PageIntro from "@/app/components/PageIntro";
import WatchlistView from "@/app/components/WatchlistView";

export const metadata = {
  title: "ウォッチリスト | NPB最強打者ランキング",
  description: "気になる選手シーズンをこの端末に保存して見返せます。",
};

export default function WatchlistPage() {
  return <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8"><PageIntro title="ウォッチリスト" description="気になる選手シーズンを保存して、いつでも見返せます。" meta="この端末・ブラウザにのみ保存されます" /><WatchlistView /></div>;
}
