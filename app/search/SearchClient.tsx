"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SearchEntry } from "@/scripts/build-search-index";

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  const results = useMemo(() => {
    if (!entries) return [];
    const q = query.trim();
    if (!q) return [];
    return entries.filter((e) => e.name.replace(/\s|　/g, "").includes(q.replace(/\s|　/g, ""))).slice(0, 50);
  }, [entries, query]);

  return (
    <div>
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="選手名を入力（例: 大谷、村上）"
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg outline-none focus:border-zinc-500"
      />

      {entries === null && (
        <p className="mt-6 text-sm text-zinc-400">読み込み中...</p>
      )}

      {entries && query.trim() && results.length === 0 && (
        <p className="mt-6 text-sm text-zinc-400">
          「{query}」に一致する選手が見つかりませんでした。
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {results.map((r) => (
          <li key={r.name}>
            <Link
              href={`/year/${r.year}/${r.rank}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 hover:bg-zinc-50"
            >
              <span className="font-bold">{r.name}</span>
              <span className="text-sm text-zinc-500">
                {r.teamName}・最終出場{r.year}年
                {r.seasons > 1 && `（通算${r.seasons}シーズン）`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
