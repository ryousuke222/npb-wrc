"use client";

import { useState } from "react";

/**
 * 年度範囲を選ぶデュアルスライダー。2本の input[type=range] を重ねて表示し、
 * つまみをドラッグするだけで範囲を選べるようにする（プルダウンを2回操作する手間を減らす）。
 * 両端の年度表示は数値入力欄も兼ねており、直接年度を打ち込んでも変更できる。
 */
export default function YearRangeSlider({
  min,
  max,
  fromYear,
  toYear,
  onChange,
}: {
  min: number;
  max: number;
  fromYear: number;
  toYear: number;
  onChange: (fromYear: number, toYear: number) => void;
}) {
  const span = Math.max(1, max - min);
  const pct = (y: number) => ((y - min) / span) * 100;

  const [fromInput, setFromInput] = useState(String(fromYear));
  const [toInput, setToInput] = useState(String(toYear));
  // スライダードラッグ等、外部からfromYear/toYearが変わった場合は入力欄の表示も
  // 追従させる（レンダー中にstateを補正する公式パターン。useEffectだと1テンポ
  // 遅れて再レンダーが走ってしまうため使わない）
  const [prevFromYear, setPrevFromYear] = useState(fromYear);
  const [prevToYear, setPrevToYear] = useState(toYear);
  if (fromYear !== prevFromYear) {
    setPrevFromYear(fromYear);
    setFromInput(String(fromYear));
  }
  if (toYear !== prevToYear) {
    setPrevToYear(toYear);
    setToInput(String(toYear));
  }

  const commitFrom = () => {
    const v = Number(fromInput);
    if (!Number.isFinite(v)) {
      setFromInput(String(fromYear));
      return;
    }
    const clamped = Math.min(Math.max(Math.round(v), min), toYear);
    onChange(clamped, toYear);
  };

  const commitTo = () => {
    const v = Number(toInput);
    if (!Number.isFinite(v)) {
      setToInput(String(toYear));
      return;
    }
    const clamped = Math.max(Math.min(Math.round(v), max), fromYear);
    onChange(fromYear, clamped);
  };

  return (
    <div className="flex min-w-[220px] flex-1 items-center gap-2 text-sm">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={fromInput}
        onChange={(e) => setFromInput(e.target.value)}
        onBlur={commitFrom}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        aria-label="開始年（入力）"
        className="ui-control w-14 shrink-0 px-1 py-1 text-right text-sm font-medium tabular-nums"
      />
      <div className="relative h-5 flex-1">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-zinc-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-zinc-700"
          style={{
            left: `${pct(fromYear)}%`,
            right: `${100 - pct(toYear)}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={fromYear}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), toYear);
            onChange(v, toYear);
          }}
          className="range-thumb absolute top-1/2 h-5 w-full -translate-y-1/2"
          aria-label="開始年"
        />
        <input
          type="range"
          min={min}
          max={max}
          value={toYear}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), fromYear);
            onChange(fromYear, v);
          }}
          className="range-thumb absolute top-1/2 h-5 w-full -translate-y-1/2"
          aria-label="終了年"
        />
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={toInput}
        onChange={(e) => setToInput(e.target.value)}
        onBlur={commitTo}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        aria-label="終了年（入力）"
        className="ui-control w-14 shrink-0 px-1 py-1 text-sm font-medium tabular-nums"
      />
      {(fromYear !== min || toYear !== max) && (
        <button
          type="button"
          onClick={() => onChange(min, max)}
          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700"
        >
          リセット
        </button>
      )}
    </div>
  );
}
