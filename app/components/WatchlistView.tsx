"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WATCHLIST_KEY, type WatchItem } from "./WatchButton";
import { teamColor, withAlpha } from "@/lib/teamColors";

function key(item: Pick<WatchItem, "year" | "rank">) { return `${item.year}-${item.rank}`; }
function fmtRate(value: number) { return value.toFixed(3).replace(/^0\./, "."); }

export default function WatchlistView() {
  const [items, setItems] = useState<WatchItem[] | null>(null);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) ?? "[]");
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, []);

  const remove = (item: WatchItem) => {
    const next = (items ?? []).filter((saved) => key(saved) !== key(item));
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
    setItems(next);
  };

  if (items === null) return <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">ウォッチリストを読み込み中…</div>;
  if (items.length === 0) return <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-500">選手詳細ページの「ウォッチに追加」から、気になるシーズンを保存できます。保存内容はこの端末・ブラウザだけに残ります。</div>;

  return <ol className="space-y-2">{items.map((item) => {
    const color = teamColor(item.teamId as Parameters<typeof teamColor>[0]);
    return <li key={key(item)} style={{ borderLeftColor: color.bg, backgroundColor: withAlpha(color.bg, 0.06) }} className="flex items-center gap-3 rounded-xl border border-l-4 border-zinc-200 px-3 py-3">
      <Link href={`/year/${item.year}/${item.rank}`} className="min-w-0 flex-1"><div className="flex items-baseline gap-2"><span className="text-xs font-bold text-zinc-400">{item.year}</span><span className="truncate text-sm font-bold text-zinc-900">{item.name}</span></div><div className="mt-1 text-xs text-zinc-500">{item.teamName}・wRC+ {Math.round(item.wrcPlus)}・{fmtRate(item.avg)}・{item.hr}本</div></Link>
      <button type="button" onClick={() => remove(item)} className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-zinc-400 hover:bg-white hover:text-zinc-700">削除</button>
    </li>;
  })}</ol>;
}
