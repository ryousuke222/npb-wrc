"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * 選手個人ページの「戻る」リンク。歴代ランキング・チーム選手一覧のように
 * RankingListが ?from=... を付与してリンクしてきた場合はその遷移元へ、
 * それ以外（年度別ランキングからの遷移・直接アクセス等）は年度別ランキングへ戻す。
 * useSearchParamsはクライアントフックのため、ページ本体を静的生成したまま
 * ここだけSuspense境界でクライアントレンダリングする。
 */
export default function PlayerBackLink({ year }: { year: number }) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  if (from === "all-time") {
    return (
      <Link href="/all-time" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← 歴代ランキングに戻る
      </Link>
    );
  }

  if (from === "team") {
    const teamId = searchParams.get("teamId");
    if (teamId) {
      return (
        <Link
          href={`/year/${year}/team/${teamId}`}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← チームの選手一覧に戻る
        </Link>
      );
    }
  }

  return (
    <Link
      href={`/year/${year}`}
      className="text-sm text-zinc-500 hover:text-zinc-800"
    >
      ← {year}年のランキングに戻る
    </Link>
  );
}
