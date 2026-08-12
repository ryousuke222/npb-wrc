"use client";

import { useRouter } from "next/navigation";

export default function YearNav({
  years,
  currentYear,
}: {
  years: number[];
  currentYear: number;
}) {
  const router = useRouter();
  const idx = years.indexOf(currentYear);
  const newer = idx > 0 ? years[idx - 1] : null;
  const older = idx >= 0 && idx < years.length - 1 ? years[idx + 1] : null;

  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
      <button
        type="button"
        disabled={!older}
        onClick={() => older && router.push(`/year/${older}`)}
        className="flex h-11 w-11 items-center justify-center border-r border-zinc-200 text-base font-bold text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
        aria-label="前の年度"
      >
        ←
      </button>
      <select
        aria-label="表示年度"
        value={currentYear}
        onChange={(e) => router.push(`/year/${e.target.value}`)}
        className="h-11 border-0 bg-white px-3 text-sm font-bold text-zinc-800 outline-none"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}年
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!newer}
        onClick={() => newer && router.push(`/year/${newer}`)}
        className="flex h-11 w-11 items-center justify-center border-l border-zinc-200 text-base font-bold text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
        aria-label="次の年度"
      >
        →
      </button>
    </div>
  );
}
