"use client";

import type { ReactNode } from "react";

export default function FilterStatusBar({
  title,
  resultLabel,
  summary,
  conditions,
  canReset = false,
  onReset,
  action,
}: {
  title?: string;
  resultLabel: string;
  summary?: string;
  conditions: string[];
  canReset?: boolean;
  onReset?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {title && (
            <h2 className="text-base font-extrabold tracking-tight text-zinc-950 sm:text-lg">
              {title}
            </h2>
          )}
          <p aria-live="polite" className="text-xs font-bold tabular-nums text-zinc-600">
            {resultLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-full px-2 py-1 text-[11px] font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden"
            >
              条件をリセット
            </button>
          )}
          {action}
        </div>
      </div>
      {(summary || conditions.length > 0) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5" aria-label="現在の表示条件">
          {summary && <span className="text-[11px] font-medium text-zinc-500 sm:text-xs">{summary}</span>}
          {conditions.map((condition) => (
            <span
              key={condition}
              className="rounded-full border border-sky-100 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-800"
            >
              {condition}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
