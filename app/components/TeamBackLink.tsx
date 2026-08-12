"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * チーム選手一覧ページの「戻る」リンク。チームwRC+一覧からの遷移時に付与された
 * scope/from/to等のクエリ文字列をそのまま引き継ぎ、絞り込み状態を保ったまま
 * チームwRC+一覧に戻れるようにする。
 * useSearchParamsはクライアントフックのため、ページ本体を静的生成したまま
 * ここだけSuspense境界でクライアントレンダリングする。
 */
export default function TeamBackLink() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const teamWrcParams = new URLSearchParams(searchParams.toString());
  teamWrcParams.delete("source");

  let href = teamWrcParams.size > 0 ? `/team-wrc?${teamWrcParams}` : "/team-wrc";
  let label = "← チームwRC+一覧に戻る";

  if (source === "home") {
    href = "/";
    label = "← ホームに戻る";
  } else if (source === "latest") {
    href = "/latest";
    label = "← 最新ランキングに戻る";
  }

  return (
    <Link
      href={href}
      className="text-sm text-zinc-500 hover:text-zinc-800"
    >
      {label}
    </Link>
  );
}
