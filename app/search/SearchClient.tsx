"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SearchEntry } from "@/scripts/build-search-index";

const MAX_RESULTS = 12;

function normalize(value: string) {
  return value.normalize("NFKC").replace(/[\s　]/g, "");
}

function matchScore(entry: SearchEntry, query: string) {
  const names = [entry.name, ...(entry.aliases ?? [])];
  let score = -1;

  for (const name of names) {
    const normalizedName = normalize(name);
    if (normalizedName === query) score = Math.max(score, 4);
    else if (normalizedName.startsWith(query)) score = Math.max(score, 3);
    else if (normalizedName.includes(query)) score = Math.max(score, 2);
  }
  return score;
}

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  const allResults = useMemo(() => {
    if (!entries) return [];
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];

    return entries
      .map((entry) => ({ entry, score: matchScore(entry, normalizedQuery) }))
      .filter((item) => item.score >= 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.entry.year - a.entry.year ||
          a.entry.name.localeCompare(b.entry.name, "ja")
      )
      .map((item) => item.entry);
  }, [entries, query]);

  const results = allResults.slice(0, MAX_RESULTS);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setQuery("");
      setActiveIndex(-1);
    } else if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      window.location.assign(`/year/${results[activeIndex].year}/${results[activeIndex].rank}`);
    }
  }

  function updateQuery(value: string) {
    setQuery(value);
    setActiveIndex(-1);
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
        <label htmlFor="player-search" className="sr-only">選手名を検索</label>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-1.5 transition focus-within:border-zinc-700 focus-within:bg-white focus-within:ring-4 focus-within:ring-zinc-100">
          <span aria-hidden="true" className="text-lg text-zinc-400">⌕</span>
          <input
            id="player-search"
            type="search"
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="選手名を入力（例：村上、大谷、矢野輝弘）"
            className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium outline-none placeholder:font-normal placeholder:text-zinc-400 sm:text-lg"
            aria-controls="search-results"
            aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          />
          {query && (
            <button
              type="button"
              onClick={() => updateQuery("")}
              className="rounded-md px-2 py-1 text-sm font-semibold text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
              aria-label="検索語をクリア"
            >
              クリア
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-xs text-zinc-500">
          改名前の登録名でも検索できます。↑↓で選択、Enterで詳細を開けます。
        </p>
      </div>

      {entries === null && <p className="mt-6 text-sm text-zinc-400">選手データを読み込み中...</p>}

      {entries && !query.trim() && (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
          気になる選手の名字・名前の一部を入力してください。
        </div>
      )}

      {entries && query.trim() && allResults.length === 0 && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
          <p className="font-bold">「{query}」に一致する選手が見つかりませんでした。</p>
          <p className="mt-1 text-zinc-500">名字だけ、または登録名の一部で試してみてください。</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between px-1 text-sm">
            <p className="font-bold text-zinc-700">検索結果 <span className="tabular-nums text-zinc-400">{allResults.length}件</span></p>
            {allResults.length > MAX_RESULTS && <p className="text-xs text-zinc-400">上位{MAX_RESULTS}件を表示</p>}
          </div>
          <ul id="search-results" className="flex flex-col gap-2">
            {results.map((result, index) => {
              const queryKey = normalize(query);
              const matchedAlias = (result.aliases ?? []).find((alias) => normalize(alias).includes(queryKey));
              return (
                <li key={result.id} id={`search-result-${index}`}>
                  <Link
                    href={`/year/${result.year}/${result.rank}`}
                    className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3.5 transition ${
                      index === activeIndex
                        ? "border-zinc-900 ring-2 ring-zinc-200"
                        : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-zinc-900">{result.name}</span>
                      {matchedAlias && (
                        <span className="mt-0.5 block text-xs font-medium text-zinc-500">旧登録名：{matchedAlias}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-right text-xs leading-5 text-zinc-500 sm:text-sm">
                      <span className="block">{result.teamName}・最終出場{result.year}年</span>
                      {result.seasons > 1 && <span>通算{result.seasons}シーズン</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
