"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const ROUTE_STATE = "__npbScrollRoute";
const POSITION_STATE = "__npbScrollY";

type ScrollHistoryState = Record<string, unknown> & {
  [ROUTE_STATE]?: string;
  [POSITION_STATE]?: number;
};

function replaceScrollState(route: string, scrollY: number) {
  const state = (window.history.state ?? {}) as ScrollHistoryState;
  window.history.replaceState(
    {
      ...state,
      [ROUTE_STATE]: route,
      [POSITION_STATE]: Math.max(0, Math.round(scrollY)),
    },
    "",
    window.location.href
  );
}

export default function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const route = query ? `${pathname}?${query}` : pathname;

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const state = (window.history.state ?? {}) as ScrollHistoryState;
    const hasAnchor = window.location.hash.length > 1;
    const savedPosition =
      !hasAnchor && state[ROUTE_STATE] === route && Number.isFinite(state[POSITION_STATE])
        ? Number(state[POSITION_STATE])
        : null;

    if (savedPosition === null && !hasAnchor) {
      replaceScrollState(route, 0);
    }

    let scrollFrame = 0;
    let restoreFrame = 0;
    const restoreTimers: number[] = [];

    const restore = () => {
      if (savedPosition === null) return;
      document.documentElement.classList.add("is-restoring-scroll");
      window.scrollTo(0, savedPosition);
      window.requestAnimationFrame(() => {
        document.documentElement.classList.remove("is-restoring-scroll");
      });
    };

    if (savedPosition !== null) {
      restoreFrame = window.requestAnimationFrame(() => {
        restoreFrame = window.requestAnimationFrame(restore);
      });
      restoreTimers.push(window.setTimeout(restore, 80));
      restoreTimers.push(window.setTimeout(restore, 220));
    }

    if (hasAnchor) {
      const anchorId = decodeURIComponent(window.location.hash.slice(1));
      restoreTimers.push(
        window.setTimeout(() => document.getElementById(anchorId)?.scrollIntoView(), 0)
      );
    }

    const save = () => replaceScrollState(route, window.scrollY);
    const onDocumentClick = (event: MouseEvent) => {
      save();
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const playerMatch = destination.pathname.match(/^\/year\/(\d+)\/(\d+)$/);
      if (!playerMatch) return;

      window.sessionStorage.setItem(
        `player-return:${playerMatch[1]}:${playerMatch[2]}`,
        "history"
      );
    };
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        save();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("click", onDocumentClick, true);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      if (restoreFrame) window.cancelAnimationFrame(restoreFrame);
      restoreTimers.forEach((timer) => window.clearTimeout(timer));
      document.documentElement.classList.remove("is-restoring-scroll");
    };
  }, [route]);

  return null;
}
