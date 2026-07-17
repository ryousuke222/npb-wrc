"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * 選手個人ページの「戻る」リンク。ランキング一覧からの遷移ではブラウザ履歴を
 * 使うため、絞り込み状態とスクロール位置を保てる。直接アクセス時は年度別などの
 * 安全な一覧ページへフォールバックする。
 * useSearchParamsはクライアントフックのため、ページ本体を静的生成したまま
 * ここだけSuspense境界でクライアントレンダリングする。
 */
export default function PlayerBackLink({ year, rank }: { year: number; rank: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const returnKey = `player-return:${year}:${rank}`;
  const isMounted = useRef(false);

  // ブラウザの戻る操作で詳細ページを離れた場合も、次の直接アクセスに
  // 過去の遷移情報が残らないようにする。開発時のReactの二重チェックでは
  // 直後に再マウントされるため、次のイベントループで実際のアンマウントか確認する。
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      window.setTimeout(() => {
        if (!isMounted.current) {
          window.sessionStorage.removeItem(returnKey);
        }
      }, 0);
    };
  }, [returnKey]);

  let href = `/year/${year}`;
  let label = `← ${year}年のランキングに戻る`;

  if (from === "all-time") {
    href = "/all-time";
    label = "← 歴代ランキングに戻る";
  }

  if (from === "team") {
    const teamId = searchParams.get("teamId");
    if (teamId) {
      href = `/year/${year}/team/${teamId}`;
      label = "← チームの選手一覧に戻る";
    }
  }

  if (from === "titles") {
    href = "/titles";
    label = "← 打撃タイトルランキングに戻る";
  }

  if (from === "records") {
    href = "/records";
    label = "← 歴代シーズン記録に戻る";
  }

  if (from === "compare") {
    href = "/compare";
    label = "← 選手比較に戻る";
  }

  const handleBack = () => {
    if (window.sessionStorage.getItem(returnKey) === "history") {
      window.sessionStorage.removeItem(returnKey);
      router.back();
      return;
    }
    router.push(href);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="text-sm text-zinc-500 hover:text-zinc-800"
    >
      {label}
    </button>
  );
}
