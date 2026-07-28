"use client";

import { useEffect, useState } from "react";

export const WATCHLIST_KEY = "npb-wrc-watchlist-v1";

export type WatchItem = {
  year: number;
  rank: number;
  name: string;
  teamName: string;
  teamId: string;
  wrcPlus: number;
  avg: number;
  hr: number;
  rbi: number;
};

function itemKey(item: Pick<WatchItem, "year" | "rank">) {
  return `${item.year}-${item.rank}`;
}

function readWatchlist(): WatchItem[] {
  try {
    const value = window.localStorage.getItem(WATCHLIST_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function WatchButton({ item }: { item: WatchItem }) {
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    setWatched(readWatchlist().some((saved) => itemKey(saved) === itemKey(item)));
  }, [item.year, item.rank]);

  const toggle = () => {
    const current = readWatchlist();
    const exists = current.some((saved) => itemKey(saved) === itemKey(item));
    const next = exists
      ? current.filter((saved) => itemKey(saved) !== itemKey(item))
      : [item, ...current].slice(0, 30);
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
    setWatched(!exists);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={watched}
      className={`inline-block rounded-full border px-2.5 py-1 text-sm font-bold transition-colors ${
        watched
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
      }`}
    >
      {watched ? "ウォッチ中" : "ウォッチに追加"}
    </button>
  );
}
