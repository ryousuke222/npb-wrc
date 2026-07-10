import * as cheerio from "cheerio";
import { teamIdFromGameName, type TeamId } from "./teams";

/**
 * 公式戦として集計対象に含めるセクション見出し（交流戦・セ・パのみ。CS/日本シリーズ等は除外）。
 * NPB.jpは2025年前後・2026年シーズン中にテンプレートを更新しており、見出し文言が
 * 旧形式（日本語）と新形式（英語）で異なる。
 */
const SAME_LEAGUE_SECTIONS = new Set([
  "セントラル・リーグ",
  "パシフィック・リーグ",
  "CENTRAL LEAGUE",
  "PACIFIC LEAGUE",
]);
const INTERLEAGUE_SECTIONS = new Set(["交流戦", "INTERLEAGUE"]);
const INCLUDED_SECTIONS = new Set([
  ...SAME_LEAGUE_SECTIONS,
  ...INTERLEAGUE_SECTIONS,
]);

export interface GameResult {
  homeTeam: TeamId;
  awayTeam: TeamId;
  homeScore: number;
  awayScore: number;
  /** 球場名（生テキスト）。パークファクター算出で地方球場（臨時開催）を除外するために使う */
  venue: string;
  /** 交流戦の試合か。パークファクター算出では対戦相手の内訳が崩れるため除外する */
  interleague: boolean;
}

/** 月別カレンダーページから、その月に試合が行われた日付(YYYYMMDD)一覧を取得する */
export function parseGameDates(html: string): string[] {
  const dates = new Set<string>();
  const re = /gm(\d{8})\.html/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    dates.add(m[1]);
  }
  return [...dates];
}

/**
 * 1日分の試合結果ページをパースする。
 * 公式戦（セ・パ・交流戦）以外のセクション（クライマックスシリーズ・日本シリーズ等）が
 * 含まれる日は、その日全体を対象外として空配列を返す
 * （NPB.jpでは公式戦とポストシーズンの試合が同じ日に混在することはないため）。
 *
 * NPB.jpのテンプレートは年度により異なるため、旧形式（tr.ststats等）と
 * 新形式（a.link_box等、2026年シーズン中盤以降）の両方に対応する。
 */
export function parseGameDayResults(html: string): GameResult[] {
  const $ = cheerio.load(html);

  const legacySections = $(".contentskind [class^='position0']")
    .map((_, el) => $(el).text().trim())
    .get();

  if (legacySections.length > 0) {
    if (!legacySections.every((t) => INCLUDED_SECTIONS.has(t))) return [];
    const interleague = legacySections.some((t) =>
      INTERLEAGUE_SECTIONS.has(t)
    );

    const results: GameResult[] = [];
    $(".contentsgame tr[align='center']").each((_, tr) => {
      const teamCells = $(tr).find("td.contentsTeam");
      const runCells = $(tr).find("td.contentsRuns");
      if (teamCells.length !== 2 || runCells.length !== 2) return;

      const homeName = $(teamCells.get(0)).text().trim();
      const awayName = $(teamCells.get(1)).text().trim();
      const homeScoreText = $(runCells.get(0)).text().trim();
      const awayScoreText = $(runCells.get(1)).text().trim();

      const infoCells = $(tr).next().find("td.contentsinfo");
      const venue = $(infoCells.get(1)).text().trim();

      pushIfValid(
        results,
        homeName,
        awayName,
        homeScoreText,
        awayScoreText,
        venue,
        interleague
      );
    });
    return results;
  }

  // 新形式（a.link_box、#interleague_title / .title 見出し）
  const newSections = $(".title")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 0);

  if (newSections.length === 0) return [];
  if (!newSections.every((t) => INCLUDED_SECTIONS.has(t))) return [];
  const interleague = newSections.some((t) => INTERLEAGUE_SECTIONS.has(t));

  const results: GameResult[] = [];
  $("a.link_box").each((_, a) => {
    const homeName = $(a).find(".team_left .team_name").text().trim();
    const awayName = $(a).find(".team_right .team_name").text().trim();
    const homeScoreText = $(a).find(".score_left").text().trim();
    const awayScoreText = $(a).find(".score_right").text().trim();

    const roundHtml = $(a).find(".round").html() ?? "";
    const [, venuePart] = roundHtml.split(/<br\s*\/?>/i);
    const venue = (venuePart ?? "").replace(/<[^>]+>/g, "").trim();

    pushIfValid(
      results,
      homeName,
      awayName,
      homeScoreText,
      awayScoreText,
      venue,
      interleague
    );
  });
  return results;
}

function pushIfValid(
  results: GameResult[],
  homeName: string,
  awayName: string,
  homeScoreText: string,
  awayScoreText: string,
  venue: string,
  interleague: boolean
) {
  if (!/^\d+$/.test(homeScoreText) || !/^\d+$/.test(awayScoreText)) return; // 中止・延期など

  const homeTeam = teamIdFromGameName(homeName);
  const awayTeam = teamIdFromGameName(awayName);
  if (!homeTeam || !awayTeam) return;

  results.push({
    homeTeam,
    awayTeam,
    homeScore: Number(homeScoreText),
    awayScore: Number(awayScoreText),
    venue,
    interleague,
  });
}
