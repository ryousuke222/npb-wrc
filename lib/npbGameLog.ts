import * as cheerio from "cheerio";

export interface GameBattingLine {
  playerName: string;
  pa: number;
}

export interface GameLogSummary {
  venue: string;
  awayTeamName: string;
  homeTeamName: string;
  away: GameBattingLine[];
  home: GameBattingLine[];
}

/**
 * 試合日ページ（gm{date}.html）が指す、試合ごとの打撃ログページへの参照。
 * NPB.jpは2025〜2026年頃にテンプレートを更新しており、試合日ページの構造・
 * 個別試合ページへのリンク方式の両方が異なる（lib/npbGames.tsの
 * parseGameDayResultsと同様の新旧分岐が必要）。
 *
 * 旧形式: 試合日ページが試合ごとの固有ID(s{date}{連番}.html)へ直接リンクしている
 *   （bis/{year}/games/配下、旧gmdivテンプレート）。表示上の回戦番号に依存しないため
 *   ほぼ100%到達できる。
 * 新形式: 試合日ページが /scores/{year}/{mmdd}/{コード-コード-回戦}/ へ直接リンクして
 *   いる（このURL自体はページが直接埋め込んでいるものなので、回戦番号を推測する
 *   必要がなく、こちらもほぼ100%到達できる）。末尾にbox.htmlを付けて取得する。
 */
export type GameLogRef =
  | { kind: "legacy"; href: string }
  | { kind: "new"; href: string };

export function parseGameLogRefs(gmHtml: string): GameLogRef[] {
  const $ = cheerio.load(gmHtml);

  const legacyLinks: GameLogRef[] = [];
  $(".contentsinfo a[href^='s']").each((_, a) => {
    const href = $(a).attr("href");
    if (href && /^s\d+\.html$/.test(href)) legacyLinks.push({ kind: "legacy", href });
  });
  if (legacyLinks.length > 0) return legacyLinks;

  const newLinks: GameLogRef[] = [];
  $("a.link_box").each((_, a) => {
    const href = $(a).attr("href");
    if (href) newLinks.push({ kind: "new", href });
  });
  return newLinks;
}

const FIXED_COLUMNS = 8; // &nbsp,守備,選手,打数,得点,安打,打点,盗塁 の後がイニング別結果

/**
 * 新形式のボックススコアページ(/scores/{year}/{mmdd}/{slug}/box.html)をパースする。
 * 打席数はイニング別結果セル（固定8列の後に続く）のうち「-」でないセルの数として数える。
 */
function parseNewFormatBoxScore(html: string): GameLogSummary | null {
  const $ = cheerio.load(html);
  const venue = $("span.place").first().text().trim();
  const awayTable = $("table#tablefix_t_b");
  const homeTable = $("table#tablefix_b_b");
  if (awayTable.length === 0 || homeTable.length === 0 || !venue) return null;

  const teamNames = $("h4")
    .map((_, el) => $(el).text().trim())
    .get();
  const [awayTeamName, homeTeamName] = teamNames;
  if (!awayTeamName || !homeTeamName) return null;

  function parseTable(table: ReturnType<typeof $>): GameBattingLine[] {
    const byPlayer = new Map<string, GameBattingLine>();
    table.find("tbody tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length <= FIXED_COLUMNS) return;
      const playerLink = $(tds.get(2)).find("a");
      if (playerLink.length === 0) return;
      const playerName = playerLink.text().trim();
      if (!playerName) return;

      let pa = 0;
      for (let i = FIXED_COLUMNS; i < tds.length; i++) {
        const text = $(tds.get(i)).text().trim();
        if (text !== "" && text !== "-") pa++;
      }

      const existing = byPlayer.get(playerName);
      if (existing) {
        existing.pa += pa;
      } else {
        byPlayer.set(playerName, { playerName, pa });
      }
    });
    return Array.from(byPlayer.values());
  }

  return {
    venue,
    awayTeamName,
    homeTeamName,
    away: parseTable(awayTable),
    home: parseTable(homeTable),
  };
}

/**
 * 旧形式の固有ID方式試合結果ページ(bis/{year}/games/s{date}{連番}.html)をパースする。
 * 打撃成績が「打数・安打・打点・四球・死球・三振」の列のみで、イニング別の結果テキストが
 * ないため、打席数は打数+四球+死球で近似する（犠打・犠飛の分だけ実際よりわずかに少なく出る）。
 */
function parseLegacyGameSummary(html: string): GameLogSummary | null {
  const $ = cheerio.load(html);

  const venue = $("#gmdivinfo td").first().text().trim();
  if (!venue) return null;

  const teamNames = $(".gmtblteam")
    .map((_, el) => $(el).text().trim())
    .get();
  const [awayTeamName, homeTeamName] = teamNames;
  if (!awayTeamName || !homeTeamName) return null;

  const statTables = $("table.gmtbltop").filter(
    (_, el) => $(el).find("tr.gmstats th.gmhdbmn").length > 0
  );
  if (statTables.length < 2) return null;

  function parseTable(table: ReturnType<typeof $>): GameBattingLine[] {
    const lines: GameBattingLine[] = [];
    table.find("tr.gmstats").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length < 6) return;
      const playerName = $(tds.get(1)).text().trim();
      if (!playerName) return;
      const ab = Number($(tds.get(2)).text().trim()) || 0;
      const bb = Number($(tds.get(5)).text().trim()) || 0;
      const hbp = Number($(tds.get(6)).text().trim()) || 0;
      lines.push({ playerName, pa: ab + bb + hbp });
    });
    return lines;
  }

  return {
    venue,
    awayTeamName,
    homeTeamName,
    away: parseTable(statTables.eq(0)),
    home: parseTable(statTables.eq(1)),
  };
}

export function parseGameLog(
  html: string,
  kind: GameLogRef["kind"]
): GameLogSummary | null {
  return kind === "legacy"
    ? parseLegacyGameSummary(html)
    : parseNewFormatBoxScore(html);
}
