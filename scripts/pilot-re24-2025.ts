/**
 * パイロット検証スクリプト（サイト本番には反映しない）。
 *
 * 2025年シーズンのNPB公式サイト「試合経過」ページ(1球速報ベースの打席ログ)から
 * 打席ごとのアウトカウント・塁上状況・結果を取得し、24状態の得点期待値表(RE24)を
 * 実データから構築する。そこから単打・二塁打・三塁打・本塁打・四球・死球の
 * 線形加重値(run value、"アウト"を基準とした相対値)を算出し、
 * 現在サイトで使っているMLB由来の近似係数と比較する。
 *
 * 実行: npx tsx scripts/pilot-re24-2025.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { parseGameDates } from "../lib/npbGames";
import { WOBA_WEIGHTS, wobaScaleForYear } from "../lib/wrc";

const YEAR = 2025;
const WOBA_SCALE = wobaScaleForYear(YEAR);
const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const REQUEST_DELAY_MS = 150;
const SEASON_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

const INCLUDED_SECTIONS = new Set([
  "セントラル・リーグ",
  "パシフィック・リーグ",
  "交流戦",
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCached(url: string, cacheKey: string): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, cacheKey);
  try {
    return await readFile(cachePath, "utf-8");
  } catch {
    // no cache
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "npb-wrc-ranking-personal-project/1.0" },
  });
  if (!res.ok) {
    await sleep(REQUEST_DELAY_MS);
    return null;
  }
  const html = await res.text();
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, html, "utf-8");
  await sleep(REQUEST_DELAY_MS);
  return html;
}

interface GameMeta {
  date: string;
  homeCode: string;
  awayCode: string;
  round: string;
}

async function getGameMetaForDate(date: string): Promise<GameMeta[]> {
  const html = await fetchCached(
    `https://npb.jp/bis/${YEAR}/games/gm${date}.html`,
    `${YEAR}-gm-${date}.html`
  );
  if (!html) return [];

  const $ = cheerio.load(html);
  const sectionTexts = $(".contentskind [class^='position0']")
    .map((_, el) => $(el).text().trim())
    .get();
  if (sectionTexts.length === 0) return [];
  if (!sectionTexts.every((t) => INCLUDED_SECTIONS.has(t))) return []; // CS/日本シリーズ等を除外

  const metas: GameMeta[] = [];
  $(".contentsgame tr[align='center']").each((_, tr) => {
    const imgs = $(tr).find("img.petMarkDetails");
    if (imgs.length !== 2) return;
    const homeSrc = $(imgs.get(0)).attr("src") ?? "";
    const awaySrc = $(imgs.get(1)).attr("src") ?? "";
    const homeMatch = homeSrc.match(/pet\d{4}_([a-z]+)_1\.gif/);
    const awayMatch = awaySrc.match(/pet\d{4}_([a-z]+)_1\.gif/);
    if (!homeMatch || !awayMatch) return;

    const roundLink = $(tr).next().find("a");
    const roundText = roundLink.text().trim();
    const roundMatch = roundText.match(/(\d+)回戦/);
    if (!roundMatch) return;

    metas.push({
      date,
      homeCode: homeMatch[1],
      awayCode: awayMatch[1],
      round: roundMatch[1],
    });
  });
  return metas;
}

async function getAllGameDates(): Promise<string[]> {
  const dateSet = new Set<string>();
  for (const month of SEASON_MONTHS) {
    const mm = String(month).padStart(2, "0");
    const html = await fetchCached(
      `https://npb.jp/bis/${YEAR}/calendar/index_${mm}.html`,
      `${YEAR}-cal-${mm}.html`
    );
    if (!html) continue;
    for (const d of parseGameDates(html)) dateSet.add(d);
  }
  return [...dateSet].sort();
}

// --- playbyplay parsing ---

const BASE_STATES = ["", "1塁", "2塁", "3塁", "1・2塁", "1・3塁", "2・3塁", "満塁"];

function baseStateIndex(text: string): number | null {
  const t = text.replace(/&nbsp;|\s/g, "").trim();
  const idx = BASE_STATES.indexOf(t);
  return idx === -1 ? null : idx;
}

type EventType =
  | "1B" | "2B" | "3B" | "HR"
  | "uBB" | "IBB" | "HBP"
  | "SH" | "SF" | "GDP" | "ROE" | "SB" | "CS" | "OUT";

/**
 * 走者の盗塁（成功・失敗）や「エラーで出塁」のプレーは、打者本人の行の後に
 * 別行として現れる（例:「（走者・野村）二塁盗塁成功」「サードゴロ（エラー）」）。
 * これらはどの既存カテゴリのキーワードにもマッチしないため、修正前は全て
 * 「OUT」（凡打と同じ）に誤分類されていた。特に「エラーで出塁」は打者が
 * 安全に出塁するプラスの事象であり、"OUT"の基準値を歪める大きなバグだった。
 */
function classifyResult(text: string): EventType {
  if (text.includes("盗塁")) return text.includes("失敗") ? "CS" : "SB";
  if (text.includes("敬遠")) return "IBB";
  if (text.includes("フォアボール") || text.includes("四球")) return "uBB";
  if (text.includes("デッドボール") || text.includes("死球")) return "HBP";
  if (text.includes("エラー")) return "ROE";
  if (text.includes("犠牲バント") || text.includes("犠打")) return "SH";
  if (text.includes("犠牲フライ") || text.includes("犠飛")) return "SF";
  if (text.includes("併殺打")) return "GDP";
  if (text.includes("ホームラン")) return "HR";
  if (text.includes("スリーベース") || text.includes("三塁打")) return "3B";
  if (text.includes("ツーベース") || text.includes("二塁打")) return "2B";
  if (text.includes("ヒット") || text.includes("安打")) return "1B";
  return "OUT";
}

interface PlateAppearance {
  outsBefore: number;
  baseIdx: number;
  event: EventType;
  runsOnPlay: number;
}

function parsePlayByPlay(html: string): PlateAppearance[][] {
  const $ = cheerio.load(html);
  const halfInnings: PlateAppearance[][] = [];

  // 各半イニングは <h5 id="comN-M"> の後に複数の <table> が続く構造
  $("h5[id^='com']").each((_, h5) => {
    const pas: PlateAppearance[] = [];
    let el = $(h5).next();
    while (el.length && el.get(0)?.tagName === "table") {
      el.find("tr").each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length < 5) return; // 投手交代等の注記行をスキップ
        const outsText = $(tds.get(0)).text().trim();
        const outsMatch = outsText.match(/(\d)アウト/);
        if (!outsMatch) return;
        const baseIdx = baseStateIndex($(tds.get(1)).text());
        if (baseIdx === null) return;
        const resultText = $(tds.get(4)).text().trim();
        const rbiMatch = resultText.match(/打点(\d)/);
        pas.push({
          outsBefore: Number(outsMatch[1]),
          baseIdx,
          event: classifyResult(resultText),
          runsOnPlay: rbiMatch ? Number(rbiMatch[1]) : 0,
        });
      });
      el = el.next();
    }
    if (pas.length > 0) halfInnings.push(pas);
  });

  return halfInnings;
}

// --- RE24 & linear weights ---

async function main() {
  console.log(`[1/4] ${YEAR}年の試合日一覧を取得中...`);
  const dates = await getAllGameDates();
  console.log(`  ${dates.length}日分`);

  console.log(`[2/4] 各日の試合メタ情報(対戦カード・回戦)を取得中...`);
  const allGames: GameMeta[] = [];
  for (const date of dates) {
    allGames.push(...(await getGameMetaForDate(date)));
  }
  console.log(`  ${allGames.length}試合`);

  console.log(`[3/4] 各試合の試合経過(playbyplay)を取得・パース中...`);
  const stateStats = new Map<number, { totalRemainingRuns: number; count: number }>();
  const eventStats = new Map<EventType, { totalRunValue: number; count: number }>();
  let parsedGames = 0;
  let skippedGames = 0;
  const allHalfInnings: PlateAppearance[][] = [];

  for (const g of allGames) {
    const slug = `${g.homeCode}-${g.awayCode}-${g.round}`;
    const url = `https://npb.jp/scores/${YEAR}/${g.date.slice(4, 8)}/${slug}/playbyplay.html`;
    const cacheKey = `${YEAR}-pbp-${g.date}-${slug}.html`;
    const html = await fetchCached(url, cacheKey);
    if (!html) {
      skippedGames++;
      continue;
    }
    const halfInnings = parsePlayByPlay(html);
    if (halfInnings.length === 0) {
      skippedGames++;
      continue;
    }
    parsedGames++;
    allHalfInnings.push(...halfInnings);

    for (const pas of halfInnings) {
      // 各打席時点から「そのイニング終了までの残り得点」を後ろから積算
      let remaining = 0;
      const remainingByIdx: number[] = new Array(pas.length);
      for (let i = pas.length - 1; i >= 0; i--) {
        remaining += pas[i].runsOnPlay;
        remainingByIdx[i] = remaining;
      }

      for (let i = 0; i < pas.length; i++) {
        const pa = pas[i];
        const stateIdx = pa.outsBefore * 8 + pa.baseIdx;
        const s = stateStats.get(stateIdx) ?? { totalRemainingRuns: 0, count: 0 };
        s.totalRemainingRuns += remainingByIdx[i];
        s.count += 1;
        stateStats.set(stateIdx, s);
      }
    }
  }
  console.log(`  ${parsedGames}試合パース成功 / ${skippedGames}試合スキップ`);

  console.log(`[4/4] RE24表と線形加重値を算出中...`);
  const RE = new Map<number, number>();
  for (const [idx, s] of stateStats) {
    RE.set(idx, s.count > 0 ? s.totalRemainingRuns / s.count : 0);
  }

  console.log("\n--- RE24表（得点期待値、アウト×塁上） ---");
  console.log("アウト\\塁上".padEnd(10), BASE_STATES.map((b) => (b || "空").padEnd(6)).join(""));
  for (let outs = 0; outs <= 2; outs++) {
    const row = [];
    for (let base = 0; base < 8; base++) {
      const idx = outs * 8 + base;
      row.push((RE.get(idx)?.toFixed(3) ?? "-").padEnd(6));
    }
    console.log(`${outs}アウト`.padEnd(10), row.join(""));
  }

  // 各打席について run value = (次状態のRE or 0) + このプレーの得点 - 現在状態のRE
  for (const pas of allHalfInnings) {
    for (let i = 0; i < pas.length; i++) {
      const pa = pas[i];
      const stateIdx = pa.outsBefore * 8 + pa.baseIdx;
      const reBefore = RE.get(stateIdx) ?? 0;
      const isLastInInning = i === pas.length - 1;
      const reAfter = isLastInInning ? 0 : RE.get(pas[i + 1].outsBefore * 8 + pas[i + 1].baseIdx) ?? 0;
      const runValue = reAfter + pa.runsOnPlay - reBefore;

      const s = eventStats.get(pa.event) ?? { totalRunValue: 0, count: 0 };
      s.totalRunValue += runValue;
      s.count += 1;
      eventStats.set(pa.event, s);
    }
  }

  console.log("\n--- イベント別 平均run value（得点期待値ベース） ---");
  const avgByEvent = new Map<EventType, number>();
  for (const [event, s] of eventStats) {
    avgByEvent.set(event, s.count > 0 ? s.totalRunValue / s.count : 0);
  }
  for (const [event, avg] of [...avgByEvent.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${event.padEnd(6)} : ${avg.toFixed(4)} (n=${eventStats.get(event)?.count})`);
  }

  const outValue = avgByEvent.get("OUT") ?? 0;
  console.log("\n--- 線形加重値（アウト基準、runs単位の生値） ---");
  const compare: [string, EventType, number][] = [
    ["uBB", "uBB", WOBA_WEIGHTS.uBB],
    ["HBP", "HBP", WOBA_WEIGHTS.HBP],
    ["1B", "1B", WOBA_WEIGHTS.single],
    ["2B", "2B", WOBA_WEIGHTS.double],
    ["3B", "3B", WOBA_WEIGHTS.triple],
    ["HR", "HR", WOBA_WEIGHTS.hr],
  ];
  const rawWeights = new Map<string, number>();
  for (const [label, event] of compare) {
    const raw = (avgByEvent.get(event) ?? 0) - outValue;
    rawWeights.set(label, raw);
    console.log(`  ${label.padEnd(4)}: ${raw.toFixed(3)} runs`);
  }

  // wOBAの公表係数（uBB .69など）は「アウト基準のruns」そのものではなく、
  // それにwOBAスケール定数（wOBAをOBPと似た目盛りに揃えるための倍率）を
  // 掛けた値。この掛け算を省いてrunsの生値と直接比較していたのが
  // 当初のパイロット結果が現行係数より大幅に低く出ていた主因。
  console.log(
    `\n--- wOBAスケール適用後（×WOBA_SCALE=${WOBA_SCALE}） vs 現行NPB版係数 ---`
  );
  for (const [label, , currentWeight] of compare) {
    const scaled = (rawWeights.get(label) ?? 0) * WOBA_SCALE;
    console.log(
      `  ${label.padEnd(4)}: 2025実データ(スケール後)=${scaled.toFixed(3)}  現行係数=${currentWeight.toFixed(3)}  差=${(scaled - currentWeight).toFixed(3)}`
    );
  }

  console.log("\n--- 参考: OUTを汚染していたイベントの内訳 ---");
  for (const ev of ["SB", "CS", "ROE"] as EventType[]) {
    const s = eventStats.get(ev);
    if (s) {
      console.log(
        `  ${ev.padEnd(4)}: n=${s.count}  平均run value=${(s.totalRunValue / s.count).toFixed(3)}`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
