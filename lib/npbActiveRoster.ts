import * as cheerio from "cheerio";

/**
 * 支配下選手一覧（50音順、/bis/players/active/index_*.html）の1エントリ。
 * 育成選手も含む、現在いずれかのNPB球団に登録されている選手の一覧。
 * MLB移籍等でNPB球団の登録から外れた選手はここには載らない。
 */
export interface ActiveRosterEntry {
  playerId: string;
  name: string;
  team: string;
}

export function parseActiveRosterIndex(html: string): ActiveRosterEntry[] {
  const $ = cheerio.load(html);
  const entries: ActiveRosterEntry[] = [];

  $("a.player_unit_1").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const idMatch = href.match(/players\/(\d+)\.html/);
    if (!idMatch) return;

    const name = $(el).find("dd.name").text().trim();
    const team = $(el).find("dd.team").text().trim();
    if (!name) return;

    entries.push({ playerId: idMatch[1], name, team });
  });

  return entries;
}
