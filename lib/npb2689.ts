/**
 * 2689web.com（個人運営の日本プロ野球記録サイト、1936年〜の公式戦全試合ボックススコアを収録）
 * からパークファクター算出に必要な試合結果（球場・本拠地/ビジター・スコア）を取得するパーサー。
 *
 * npb.jp公式サイトには2005年より前の試合単位データが存在しないため、それより前の年度の
 * パークファクター算出にのみ使用する（打撃成績自体はnpb.jp公式の選手個人ページを使用）。
 * サイトはShift_JISエンコーディング。
 */

/** 年度ページ（例: https://2689web.com/2000.html）から、リーグごとの対戦カードシリーズ一覧を取得する */
export interface SeriesLink {
  /** 例: "GD"（読売-中日）。 {year}/{code}/ 配下に試合ページがある */
  code: string;
}

function extractSeriesLinksFromSection(section: string): string[] {
  const links = section.matchAll(/href='\d+\/([A-Za-z]+)\/\d+[A-Za-z]+\.html'/g);
  const codes = new Set<string>();
  for (const m of links) codes.add(m[1]);
  return [...codes];
}

export function parseSeriesLinks(yearHtml: string): {
  central: string[];
  pacific: string[];
} {
  // 「セ･リーグ／ホーム勝敗表」「パ･リーグ／ホーム勝敗表」の見出し以降、次の見出しまでを
  // それぞれのリーグのセクションとみなす（サイトのHTMLは半角中点/全角中点が混在するため
  // 「リーグ／ホーム勝敗表」の部分だけで検索する）。
  const marker = "リーグ／ホーム勝敗表";
  const positions: { index: number; isCentral: boolean }[] = [];
  let searchFrom = 0;
  while (true) {
    const idx = yearHtml.indexOf(marker, searchFrom);
    if (idx === -1) break;
    const precedingChar = yearHtml.slice(Math.max(0, idx - 3), idx);
    const isCentral = precedingChar.includes("セ");
    positions.push({ index: idx, isCentral });
    searchFrom = idx + marker.length;
  }

  const central: string[] = [];
  const pacific: string[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = i + 1 < positions.length ? positions[i + 1].index : start + 10000;
    const section = yearHtml.slice(start, end);
    const codes = extractSeriesLinksFromSection(section);
    if (positions[i].isCentral) central.push(...codes);
    else pacific.push(...codes);
  }

  return { central: [...new Set(central)], pacific: [...new Set(pacific)] };
}

export interface SeriesGameEntry {
  /** 個別試合ページのファイル名。例: "GD1.html"（{year}/{code}/ 配下） */
  gameFile: string;
  date: string;
}

/** シリーズのナビゲーションページ（例: {year}/GD/GD.html）から個別試合一覧を取得する */
export function parseSeriesNav(navHtml: string): SeriesGameEntry[] {
  const entries: SeriesGameEntry[] = [];
  const rows = navHtml.matchAll(
    /<td class='kaisen'>\d+<\/td><td>([\d/]+)<\/td>.*?href='([A-Za-z]+\d+\.html)'/g
  );
  for (const m of rows) {
    entries.push({ date: m[1], gameFile: m[2] });
  }
  return entries;
}

export interface GameScoreResult {
  venue: string;
  awayTeamName: string;
  homeTeamName: string;
  awayScore: number;
  homeScore: number;
}

/**
 * 個別試合ページ（例: {year}/GD/GD1.html）から球場・本拠地/ビジター・スコアを取得する。
 * タイトルタグが「{ホーム}vs{ビジター}　{回戦}」の順で入っている（実際の本拠地球場との
 * 突き合わせで確認済み：例えば中日主催カードでは「中日vs巨人」、巨人主催カードでは
 * 「巨人vs中日」の順になる）。
 * スコアは画像ファイル名（score/8.gif = 8点）に数字が直接埋め込まれているため、
 * それぞれのチーム行から抽出する（先頭がビジター行、2番目がホーム行の順で出現する、
 * 一般的な野球のボックススコア表示規則）。
 */
export function parseGameScorePage(html: string): GameScoreResult | null {
  const titleMatch = html.match(/<title>([^<]*?)vs([^<]*?)\s*[\s　]*\d+回戦/);
  if (!titleMatch) return null;
  const homeTeamName = titleMatch[1].trim();
  const awayTeamName = titleMatch[2].trim();

  const venueMatch = html.match(/<span>[^<]*?回戦[　\s]+([^\s　][^０-９0-9]*?)[　\s]+[\d,]+人<\/span>/);
  if (!venueMatch) return null;
  const venue = venueMatch[1].trim();

  const boardIdx = html.indexOf("class='board1'");
  if (boardIdx === -1) return null;
  const boardSection = html.slice(boardIdx, boardIdx + 4000);
  const teamRows = [
    ...boardSection.matchAll(/<tr><td class='[a-z0-9-]+'>[\s\S]*?<\/tr>/g),
  ].filter((m) => /score\/\d+\.gif/.test(m[0]));
  if (teamRows.length < 2) return null;

  const scoresOf = (row: string): number[] =>
    [...row.matchAll(/score\/(\d+)\.gif/g)].map((m) => Number(m[1]));

  const awayScores = scoresOf(teamRows[0][0]);
  const homeScores = scoresOf(teamRows[1][0]);
  if (awayScores.length < 3 || homeScores.length < 3) return null;

  const awayScore = awayScores[awayScores.length - 3];
  const homeScore = homeScores[homeScores.length - 3];

  return { venue, awayTeamName, homeTeamName, awayScore, homeScore };
}
