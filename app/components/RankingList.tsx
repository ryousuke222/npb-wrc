"use client";

import Link from "next/link";
import type { BatterRanking } from "@/lib/types";
import { readableOnLight, teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus, wrcPlusTextColor } from "@/lib/wrc";
import TeamBadge from "./TeamBadge";

const defaultValueColor = wrcPlusTextColor;

export default function RankingList({
  batters,
  showYear = false,
  backQuery = "from=year",
  valueLabel = "wRC+",
  getValue = (b) => b.wrcPlus,
  formatValue = fmtWrcPlus,
  getValueColor = defaultValueColor,
  showTitles = true,
}: {
  batters: BatterRanking[];
  /** 年度をまたぐ一覧（歴代ランキング等）で、各行に年度を表示する */
  showYear?: boolean;
  /** 選手詳細ページの直接アクセス時に使う戻り先を示すクエリ文字列（例: "from=all-time"） */
  backQuery?: string;
  /** 右側に表示する数値のラベル（デフォルトはwRC+） */
  valueLabel?: string;
  /** 右側に表示する数値を取り出す関数（デフォルトはwRC+） */
  getValue?: (b: BatterRanking) => number;
  /** 右側の数値のフォーマット関数（デフォルトはwRC+の書式） */
  formatValue?: (n: number) => string;
  /** 右側の数値の色分け関数（デフォルトはwRC+のしきい値による色分け） */
  getValueColor?: (n: number) => string;
  /**
   * 打撃タイトルバッジを幅広画面の空白部分に表示するか。
   * 3列グリッド等、カード自体の実幅が狭い文脈ではfalseにして崩れを防ぐ
   */
  showTitles?: boolean;
}) {
  if (batters.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">
        条件に一致する打者がいません。打席数の条件を下げてみてください。
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {batters.map((b, i) => {
        const displayPos = i + 1;
        const color = teamColor(b.teamId);
        return (
          <li key={`${b.year}-${b.league}-${b.name}-${b.teamId}-${b.rank}`}>
            <Link
              href={`/year/${b.year}/${b.rank}${backQuery ? `?${backQuery}` : ""}`}
              onClick={() => {
                // 詳細ページの「戻る」は履歴を使うことで、一覧の絞り込み状態と
                // スクロール位置をブラウザに復元させる。直接アクセス時はマーカーが
                // ないため、詳細ページ側で通常の一覧リンクへフォールバックする。
                window.sessionStorage.setItem(`player-return:${b.year}:${b.rank}`, "history");
              }}
              style={{
                borderLeftColor: color.bg,
                backgroundColor: withAlpha(color.bg, 0.1),
              }}
              className="flex items-center gap-3 rounded-xl border border-l-[6px] border-zinc-200/80 px-3 py-2.5 transition-transform hover:-translate-y-0.5 hover:shadow-sm sm:py-3"
            >
              <span
                style={{
                  backgroundColor: withAlpha(color.bg, 0.14),
                  color: readableOnLight(color.bg),
                  boxShadow: `inset 0 0 0 2px ${withAlpha(color.bg, 0.38)}`,
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold tabular-nums sm:h-11 sm:w-11 sm:text-lg"
              >
                {displayPos}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold tracking-tight text-zinc-950 sm:text-lg">
                  {b.name}
                  {b.age !== undefined && (
                    <span className="ml-1 text-xs font-medium text-zinc-500 sm:text-sm">
                      ({b.age})
                    </span>
                  )}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  {showYear && (
                    <span
                      style={{
                        backgroundColor: withAlpha(color.bg, 0.1),
                        color: readableOnLight(color.bg),
                        boxShadow: `inset 0 0 0 1px ${withAlpha(color.bg, 0.42)}`,
                      }}
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    >
                      {b.year}年
                    </span>
                  )}
                  <TeamBadge teamId={b.teamId} name={b.teamName} />
                  <span className="text-[10px] font-medium text-zinc-500">
                    {b.league === "central" ? "セ" : "パ"}
                  </span>
                  {b.bats && (
                    <span className="text-[10px] font-medium text-zinc-500">
                      {b.bats}打
                    </span>
                  )}
                  {b.position && (
                    <span className="text-[10px] font-medium text-zinc-500">
                      {b.position}
                    </span>
                  )}
                  {!b.qualified && (
                    <span className="rounded bg-white/80 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      規定未満
                    </span>
                  )}
                  {showTitles &&
                    b.titles?.map((title, titleIndex) => (
                      <span
                        key={title}
                        style={{
                          backgroundColor: withAlpha(color.bg, 0.23),
                          color: readableOnLight(color.bg),
                          boxShadow: `inset 0 0 0 1px ${withAlpha(color.bg, 0.32)}`,
                        }}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                          titleIndex > 1 ? "hidden sm:inline-flex" : ""
                        }`}
                      >
                        {title}
                      </span>
                    ))}
                  {showTitles && (b.titles?.length ?? 0) > 2 && (
                    <span
                      style={{
                        backgroundColor: withAlpha(color.bg, 0.12),
                        color: readableOnLight(color.bg),
                        boxShadow: `inset 0 0 0 1px ${withAlpha(color.bg, 0.28)}`,
                      }}
                      title={`ほか${b.titles!.length - 2}件の獲得タイトル`}
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap sm:hidden"
                    >
                      +{b.titles!.length - 2}
                    </span>
                  )}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span
                  className={`block font-extrabold leading-none tabular-nums ${
                    valueLabel === "wRC+" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                  } ${getValueColor(getValue(b))}`}
                >
                  {formatValue(getValue(b))}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-zinc-600">
                  {valueLabel}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
