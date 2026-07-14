import * as cheerio from "cheerio";
import type { CountingStats, LeagueKey } from "./types";
import { teamIdFromGameName, type TeamId } from "./teams";

// 球団別個人打撃成績ページ（規定打席の制限なし、全打者）の1行分の生データ
export interface RawBatterRow extends CountingStats {
  name: string;
  avg: number;
  slg: number;
  obp: number;
}

export interface TeamBattingRow extends CountingStats {
  teamId: TeamId;
  /** idb1_{code}.html のcode部分。ロースターページ取得に使う */
  code: string;
  teamName: string;
}

function num(text: string): number {
  const cleaned = text.trim();
  if (cleaned === "" || cleaned === "-" || cleaned === "--") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function emptyCountingStats(): CountingStats {
  return {
    games: 0,
    pa: 0,
    ab: 0,
    runs: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    totalBases: 0,
    rbi: 0,
    sb: 0,
    cs: 0,
    sh: 0,
    sf: 0,
    bb: 0,
    ibb: 0,
    hbp: 0,
    so: 0,
    gdp: 0,
  };
}

/**
 * チーム打撃成績ページ（tmb_c.html / tmb_p.html）をパースする。
 * 球団ごとの内訳（試合数・打席数など）と、球団別個人成績ページ（idb1_xx.html）への
 * コードを取得する。
 * 列順: チーム, 打率, 試合, 打席, 打数, 得点, 安打, 二塁打, 三塁打, 本塁打,
 *       塁打, 打点, 盗塁, 盗塁刺, 犠打, 犠飛, 四球, 故意四, 死球, 三振, 併殺打, 長打率, 出塁率
 */
export function parseTeamBattingRows(html: string): TeamBattingRow[] {
  const $ = cheerio.load(html);
  const rows: TeamBattingRow[] = [];

  $("tr.ststats").each((_, el) => {
    const tds = $(el).find("td");
    if (tds.length < 23) return;

    const link = $(tds.get(0)).find("a[href^='idb1_']");
    if (link.length === 0) return;
    const href = link.attr("href") ?? "";
    const codeMatch = href.match(/idb1_([a-z]+)\.html/);
    if (!codeMatch) return;
    const rawTeamName = link.text().trim();
    const teamId = teamIdFromGameName(rawTeamName);
    if (!teamId) return;
    const teamName = rawTeamName.replace(/[\s　]/g, "");

    const cell = (i: number) => $(tds.get(i)).text().trim();
    const n = (i: number) => num(cell(i));

    rows.push({
      teamId,
      code: codeMatch[1],
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
      ibb: n(17),
      hbp: n(18),
      so: n(19),
      gdp: n(20),
    });
  });

  return rows;
}

export function sumTeamBattingRows(rows: TeamBattingRow[]): CountingStats {
  const totals = emptyCountingStats();
  for (const r of rows) {
    totals.games += r.games;
    totals.pa += r.pa;
    totals.ab += r.ab;
    totals.runs += r.runs;
    totals.hits += r.hits;
    totals.doubles += r.doubles;
    totals.triples += r.triples;
    totals.hr += r.hr;
    totals.totalBases += r.totalBases;
    totals.rbi += r.rbi;
    totals.sb += r.sb;
    totals.cs += r.cs;
    totals.sh += r.sh;
    totals.sf += r.sf;
    totals.bb += r.bb;
    totals.ibb += r.ibb;
    totals.hbp += r.hbp;
    totals.so += r.so;
    totals.gdp += r.gdp;
  }
  return totals;
}

/**
 * 球団別個人打撃成績ページ（idb1_xx.html）をパースする。規定打席に関わらず
 * その球団に在籍した全選手（投手の代打成績等も含む）が対象。
 * 列順: (打者マーク), 選手, 試合, 打席, 打数, 得点, 安打, 二塁打, 三塁打, 本塁打,
 *       塁打, 打点, 盗塁, 盗塁刺, 犠打, 犠飛, 四球, 故意四, 死球, 三振, 併殺打, 打率, 長打率, 出塁率
 */
function buildRow(
  name: string,
  cell: (offset: number) => string
): RawBatterRow | null {
  if (!name) return null;
  const n = (offset: number) => num(cell(offset));

  const pa = n(1);
  if (pa <= 0) return null; // 一度も打席に立っていない投手などは除外

  return {
    name,
    games: n(0),
    pa,
    ab: n(2),
    runs: n(3),
    hits: n(4),
    doubles: n(5),
    triples: n(6),
    hr: n(7),
    totalBases: n(8),
    rbi: n(9),
    sb: n(10),
    cs: n(11),
    sh: n(12),
    sf: n(13),
    bb: n(14),
    ibb: n(15),
    hbp: n(16),
    so: n(17),
    gdp: n(18),
    avg: num(cell(19)),
    slg: num(cell(20)),
    obp: num(cell(21)),
  };
}

/**
 * 球団別個人打撃成績ページ（idb1_xx.html）をパースする。規定打席に関わらず
 * その球団に在籍した全選手（投手の代打成績等も含む）が対象。
 * NPB.jpは2025年前後でテンプレートが変わっており、旧形式（tr.ststats、打者マーク列あり）
 * と新形式（table.tablefix2、マークは選手名セル内の<sup>）の両方に対応する。
 */
export function parseTeamRosterPage(html: string): RawBatterRow[] {
  const $ = cheerio.load(html);
  const rows: RawBatterRow[] = [];

  const legacyRows = $("tr.ststats");
  if (legacyRows.length > 0) {
    legacyRows.each((_, el) => {
      const tds = $(el).find("td");
      if (tds.length < 24) return;
      const name = $(tds.get(1)).text().trim();
      const cell = (offset: number) => $(tds.get(2 + offset)).text().trim();
      const row = buildRow(name, cell);
      if (row) rows.push(row);
    });
    return rows;
  }

  $("table.tablefix2 tbody tr").each((_, el) => {
    const tds = $(el).find("td");
    if (tds.length < 23) return;
    const nameTd = $(tds.get(0)).clone();
    nameTd.find("sup").remove();
    const name = nameTd.text().trim();
    const cell = (offset: number) => $(tds.get(1 + offset)).text().trim();
    const row = buildRow(name, cell);
    if (row) rows.push(row);
  });

  return rows;
}

/**
 * 球団別個人投手成績ページ（idp1_xx.html）から、投手として登録されている
 * 選手名の一覧を取得する。セ・リーグはDH制がなく投手も打席に立つため、
 * リーグ平均wOBA/得点の算出（wRC+の分母）からは投手の打席を除外する必要がある
 * （個々の選手表示自体は投手の代打成績も含めて従来通り行う）。
 * idb1と同じく新旧テンプレート（tr.ststats / table.tablefix2）に対応する。
 */
export function parsePitcherNames(html: string): Set<string> {
  const $ = cheerio.load(html);
  const names = new Set<string>();

  const legacyRows = $("tr.ststats");
  if (legacyRows.length > 0) {
    legacyRows.each((_, el) => {
      const tds = $(el).find("td");
      if (tds.length < 2) return;
      const name = $(tds.get(1)).text().trim();
      if (name) names.add(name);
    });
    return names;
  }

  $("table.tablefix2 tbody tr").each((_, el) => {
    const tds = $(el).find("td");
    if (tds.length === 0) return;
    const nameTd = $(tds.get(0)).clone();
    nameTd.find("sup").remove();
    const name = nameTd.text().trim();
    if (name) names.add(name);
  });

  return names;
}

const LIVE_FIELDING_POSITIONS = ["一塁手", "二塁手", "三塁手", "遊撃手", "外野手", "捕手", "投手"] as const;
export type LiveFieldingPosition = (typeof LIVE_FIELDING_POSITIONS)[number];

/**
 * 進行中シーズンの個人守備成績ページ（idf1_{team}.html）をパースする。
 * 完了済みシーズンのアーカイブページ（表形式・colspan構成）とは異なり、
 * <h5>ポジション名</h5>の直後に<table class="tablefix2">が続く、見出し単位の構成。
 * 各ポジション見出しごとに、選手名と試合数（先頭2列）だけを取り出す。
 */
export function parseLiveFieldingPage(
  html: string
): { name: string; position: LiveFieldingPosition; games: number }[] {
  const $ = cheerio.load(html);
  const rows: { name: string; position: LiveFieldingPosition; games: number }[] = [];

  $("h5").each((_, h5el) => {
    const label = $(h5el).text().trim();
    if (!(LIVE_FIELDING_POSITIONS as readonly string[]).includes(label)) return;
    const position = label as LiveFieldingPosition;

    const table = $(h5el).nextAll("table.tablefix2").first();
    table.find("tbody tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length < 2) return;
      const name = $(tds.get(0)).text().trim();
      const games = Number($(tds.get(1)).text().trim());
      if (name && Number.isFinite(games) && games > 0) {
        rows.push({ name, position, games });
      }
    });
  });

  return rows;
}

export function toBatterRow(
  raw: RawBatterRow,
  team: TeamBattingRow,
  league: LeagueKey
) {
  return {
    ...raw,
    league,
    teamId: team.teamId,
    teamName: team.teamName,
  };
}
