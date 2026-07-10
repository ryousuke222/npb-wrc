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
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={!older}
        onClick={() => older && router.push(`/year/${older}`)}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm disabled:opacity-30"
        aria-label="前の年度"
      >
        ←
      </button>
      <select
        value={currentYear}
        onChange={(e) => router.push(`/year/${e.target.value}`)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
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
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm disabled:opacity-30"
        aria-label="次の年度"
      >
        →
      </button>
    </div>
  );
}
