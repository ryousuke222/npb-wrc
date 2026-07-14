import * as cheerio from "cheerio";
import type { LeagueKey } from "./types";

export interface BestNineWinner {
  league: LeagueKey;
  position: string;
  name: string;
  teamText: string;
}

const BATTING_POSITIONS = new Set(["捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"]);

/**
 * ベストナイン投票結果ページ（/award/{year}/voting_bt9.html）をパースする。
 * セ・リーグ／パ・リーグ両方のセクションが1ページにまとまっており、
 * 各ポジションの受賞者（class="current"の行、◎印）だけを拾う。
 * 投手部門はこのサイトの対象（打者）ではないため除外する。
 *
 * h5(リーグ見出し)・th[colspan=4](ポジション見出し)・tr.current(受賞者行)を
 * まとめて選択し、文書順（cheerioが返す順序）に状態を追跡しながら走査する。
 */
export function parseBestNine(html: string): BestNineWinner[] {
  const $ = cheerio.load(html);
  const winners: BestNineWinner[] = [];

  let currentLeague: LeagueKey | null = null;
  let currentPosition = "";

  $("h5, th, tr.current").each((_, el) => {
    const $el = $(el);
    if (el.tagName === "h5") {
      const cls = $el.find("span").attr("class") ?? "";
      if (cls.includes("teamflag_central")) currentLeague = "central";
      else if (cls.includes("teamflag_pacific")) currentLeague = "pacific";
    } else if (el.tagName === "th") {
      if ($el.attr("colspan") === "4") currentPosition = $el.text().trim();
    } else {
      const tds = $el.find("td");
      if (tds.length >= 3 && currentLeague && BATTING_POSITIONS.has(currentPosition)) {
        winners.push({
          league: currentLeague,
          position: currentPosition,
          name: $(tds.get(1)).text().replace(/[\s　]/g, "").trim(),
          teamText: $(tds.get(2)).text().trim(),
        });
      }
    }
  });

  return winners;
}
