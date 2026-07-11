import * as cheerio from "cheerio";
import type { CountingStats } from "./types";

/**
 * プロ野球在籍者名簿（50音順、/history/register/index_*.html）の1エントリ。
 *
 * 在籍年・球団のテキスト（例:「78～80近鉄」「95～08横浜,09～14ヤクルト,15～17巨人,19～21巨人（コ）」）は、
 * 改名・非連続年・コーチ期間混在などで機械的に正確な年度判定をするには複雑すぎるため、
 * ここでは「対象期間に何らかの形で関わっていそうか」を粗く判定する候補絞り込みにのみ使う。
 * 実際にどの年度に打者として出場したかは、選手個人ページ自身の打撃成績テーブル
 * （parseHistoricalPlayerPage）を一次データとして判定する。
 */
export interface RegistryEntry {
  playerId: string;
  name: string;
  yearsText: string;
}

export function parseRegistryIndex(html: string): RegistryEntry[] {
  const $ = cheerio.load(html);
  const entries: RegistryEntry[] = [];

  $("a.player_unit_1").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const idMatch = href.match(/players\/(\d+)\.html/);
    if (!idMatch) return;

    const tds = $(el).find("td");
    if (tds.length < 3) return;
    const nameTd = $(tds.get(0)).clone();
    nameTd.find("span").remove();
    const name = nameTd.text().trim();
    const yearsText = $(tds.get(2)).text().trim();
    if (!name) return;

    entries.push({ playerId: idMatch[1], name, yearsText });
  });

  return entries;
}

function twoDigitToYear(n: number): number {
  return n < 30 ? 2000 + n : 1900 + n;
}

/**
 * 在籍年テキストから、含まれる2桁年（西暦下2桁）を4桁に変換した集合を粗く抽出する。
 * 対象期間と重なる可能性がある候補選手を絞り込むためだけに使う（多少過剰に拾っても、
 * 実際の年度判定は個人ページの打撃成績テーブル側で行うため問題ない）。
 *
 * 「93～02巨人」のような「～」区切りは連続した在籍期間を表すため、両端の年だけでなく
 * 間の年も全て展開する（そうしないと両端が対象期間の外にあるだけで、実際には
 * 対象期間をすっぽり含む選手を候補から取りこぼしてしまう）。
 */
export function extractCandidateYears(yearsText: string): Set<number> {
  const years = new Set<number>();

  const rangeMatches = yearsText.matchAll(/(\d{2})[～~](\d{2})/g);
  for (const m of rangeMatches) {
    const start = twoDigitToYear(Number(m[1]));
    const end = twoDigitToYear(Number(m[2]));
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    for (let y = lo; y <= hi; y++) years.add(y);
  }

  // 範囲表記の一部として既に処理した数字は除き、残りの単独の2桁年も拾う
  const withoutRanges = yearsText.replace(/(\d{2})[～~](\d{2})/g, "");
  const singleMatches = withoutRanges.match(/\d{2}/g) ?? [];
  for (const m of singleMatches) {
    years.add(twoDigitToYear(Number(m)));
  }

  return years;
}

/**
 * 在籍年テキスト（例:「11,12中日,13,14DeNA」「20～24途DeNA（育）,24途～25DeNA」
 * 「18途～19巨人」のように開始年と終了年の間に「途」「開幕」等の注記が挟まるものも含む）を、
 * 年度のまとまりごとにチーム名テキストへ対応付けてパースする。
 * 「年」トークン（2桁、または2桁+任意の注記文字+「～」+2桁の範囲）と「非年」トークン
 * （チーム名＋育成/開幕～途中等の注記）が交互に現れる構造を利用し、非年トークンが
 * 現れた時点でそれ以前に溜めた年をまとめてそのチーム名テキストに割り当てる。
 * チーム名テキストへの注記混入はteamIdFromGameName側の部分一致で吸収されるため、
 * 多少ノイズが混じっても実用上問題ない（同一選手内で同じ球団の年度がテキストの
 * 区切り方次第で複数ブロックに分かれることがあるが、それも実害はない）。
 */
export function parseYearsTeamText(
  yearsText: string
): { years: number[]; teamText: string }[] {
  const pairs: { years: number[]; teamText: string }[] = [];
  const tokenRe = /(\d{2}(?:[^\d,]*?[～~]\d{2})?)|([^\d,]+)/g;
  let currentYears: number[] = [];
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(yearsText))) {
    if (m[1]) {
      const rangeMatch = m[1].match(/^(\d{2}).*?[～~](\d{2})$/);
      if (rangeMatch) {
        const lo = twoDigitToYear(Number(rangeMatch[1]));
        const hi = twoDigitToYear(Number(rangeMatch[2]));
        for (let y = Math.min(lo, hi); y <= Math.max(lo, hi); y++) {
          currentYears.push(y);
        }
      } else {
        currentYears.push(twoDigitToYear(Number(m[1])));
      }
    } else if (m[2] && currentYears.length > 0) {
      pairs.push({ years: currentYears, teamText: m[2] });
      currentYears = [];
    }
  }

  return pairs;
}

export interface HistoricalBattingRow extends CountingStats {
  year: number;
  teamName: string;
}

/**
 * 選手個人ページ（/bis/players/{id}.html）の年度別打撃成績テーブルをパースする。
 * 敬遠（IBB）の列が存在しないため、ibbは常に0として扱う（歴史データの既知の制約）。
 * 投手として登板歴がある（tablefix_pが存在する）選手は、リーグ平均算出時に
 * 除外すべき対象として isPitcher フラグで返す。
 */
export function parseHistoricalPlayerPage(html: string): {
  battingRows: HistoricalBattingRow[];
  isPitcher: boolean;
} {
  const $ = cheerio.load(html);
  const isPitcher = $("table#tablefix_p").length > 0;

  const battingRows: HistoricalBattingRow[] = [];
  $("table#tablefix_b tbody tr.registerStats").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 22) return;

    const yearText = $(tds.get(0)).text().trim();
    const year = Number(yearText);
    if (!Number.isInteger(year)) return;

    const teamName = $(tds.get(1)).text().replace(/[\s　]/g, "").trim();
    const n = (i: number) => {
      const t = $(tds.get(i)).text().trim();
      const v = Number(t);
      return Number.isFinite(v) ? v : 0;
    };

    battingRows.push({
      year,
      teamName,
      games: n(2),
      pa: n(3),
      ab: n(4),
      runs: n(5),
      hits: n(6),
      doubles: n(7),
      triples: n(8),
      hr: n(9),
      totalBases: n(10),
      rbi: n(11),
      sb: n(12),
      cs: n(13),
      sh: n(14),
      sf: n(15),
      bb: n(16),
      ibb: 0,
      hbp: n(17),
      so: n(18),
      gdp: n(19),
    });
  });

  return { battingRows, isPitcher };
}

export interface YearlyTeamStanding {
  teamName: string;
  games: number;
}

/**
 * 年度別成績ページ（/bis/yearly/centralleague_{year}.html 等）の
 * チーム勝敗表から、球団ごとの試合数を取得する（規定打席の目安算出に使う）。
 */
export function parseYearlyTeamStandings(html: string): YearlyTeamStanding[] {
  const $ = cheerio.load(html);
  const rows: YearlyTeamStanding[] = [];

  $("a[name='standings']")
    .parent()
    .next()
    .find("table tr")
    .each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length < 4) return;
      const teamName = $(tds.get(0)).text().replace(/[\s　]/g, "").trim();
      const games = Number($(tds.get(1)).text().trim());
      if (!teamName || !Number.isFinite(games)) return;
      rows.push({ teamName, games });
    });

  return rows;
}
