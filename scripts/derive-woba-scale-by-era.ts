/**
 * lib/wrc.tsのWOBA_SCALE_BY_ERAが実データと整合しているかを検証するスクリプト。
 * derive-woba-scale.ts（2005年以降のnpb.jp公式チーム成績ページのみが対象）を、
 * data/*.json全年度（1955年以降の歴史データ含む）から時代区分ごとに再導出できるよう
 * 一般化したもの。10年刻みの内訳も出すため、区分の粒度を変えた場合の影響も確認できる。
 *
 * 実行: npx tsx scripts/derive-woba-scale-by-era.ts
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { calcWoba } from "../lib/wrc";
import type { CountingStats, YearData } from "../lib/types";
import type { TeamId } from "../lib/teams";

const DATA_DIR = path.join(process.cwd(), "data");

function emptyStats(): CountingStats {
  return {
    games: 0, pa: 0, ab: 0, runs: 0, hits: 0, doubles: 0, triples: 0, hr: 0,
    totalBases: 0, rbi: 0, sb: 0, cs: 0, sh: 0, sf: 0, bb: 0, ibb: 0, hbp: 0, so: 0, gdp: 0,
  };
}
function add(a: CountingStats, b: CountingStats) {
  a.games += b.games; a.pa += b.pa; a.ab += b.ab; a.runs += b.runs; a.hits += b.hits;
  a.doubles += b.doubles; a.triples += b.triples; a.hr += b.hr; a.totalBases += b.totalBases;
  a.rbi += b.rbi; a.sb += b.sb; a.cs += b.cs; a.sh += b.sh; a.sf += b.sf; a.bb += b.bb;
  a.ibb += b.ibb; a.hbp += b.hbp; a.so += b.so; a.gdp += b.gdp;
}

function regress(points: { x: number; y: number }[]) {
  let sumX2 = 0, sumXY = 0;
  for (const p of points) { sumX2 += p.x * p.x; sumXY += p.x * p.y; }
  const scale = sumX2 / sumXY;
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const pred = p.x / scale;
    ssRes += (p.y - pred) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const rSquared = 1 - ssRes / ssTot;
  return { scale, rSquared, n: points.length };
}

async function main() {
  const years = JSON.parse(await readFile(path.join(DATA_DIR, "years.json"), "utf-8")) as number[];

  // 年度・リーグ・球団ごとにチーム全体（投手の代打成績含む）を集計
  type Point = { x: number; y: number; year: number };
  const allPoints: Point[] = [];

  for (const year of years) {
    const raw = await readFile(path.join(DATA_DIR, `${year}.json`), "utf-8").catch(() => null);
    if (!raw) continue;
    const data: YearData = JSON.parse(raw);

    for (const league of ["central", "pacific"] as const) {
      const teamTotals = new Map<TeamId, CountingStats>();
      for (const b of data.batters) {
        if (b.league !== league) continue;
        const t = teamTotals.get(b.teamId) ?? emptyStats();
        add(t, b);
        teamTotals.set(b.teamId, t);
      }
      const lgTotals = emptyStats();
      for (const t of teamTotals.values()) add(lgTotals, t);
      if (lgTotals.pa === 0) continue;
      const lgWoba = calcWoba(lgTotals);
      const lgRunsPerPa = lgTotals.runs / lgTotals.pa;

      for (const t of teamTotals.values()) {
        if (t.pa < 1000) continue; // サンプルが極端に少ない球団年度は除外（欠陥球団・混乱期等）
        const x = calcWoba(t) - lgWoba;
        const y = t.runs / t.pa - lgRunsPerPa;
        allPoints.push({ x, y, year });
      }
    }
  }

  console.log(`総サンプル数（チーム×リーグ×年度）: ${allPoints.length}\n`);

  const overall = regress(allPoints);
  console.log(`【全期間 (${years[years.length - 1]}-${years[0]})】 scale=${overall.scale.toFixed(4)} R²=${overall.rSquared.toFixed(4)} n=${overall.n}`);

  const buckets: [string, number, number][] = [
    ["1955-1974", 1955, 1974],
    ["1975-1994", 1975, 1994],
    ["1995-2004", 1995, 2004],
    ["2005-2026", 2005, 2026],
  ];
  console.log();
  for (const [label, lo, hi] of buckets) {
    const pts = allPoints.filter((p) => p.year >= lo && p.year <= hi);
    if (pts.length < 10) {
      console.log(`【${label}】 サンプル不足(n=${pts.length})`);
      continue;
    }
    const r = regress(pts);
    console.log(`【${label}】 scale=${r.scale.toFixed(4)} R²=${r.rSquared.toFixed(4)} n=${r.n}`);
  }

  // 10年刻みでも見る
  console.log();
  for (let decadeStart = 1955; decadeStart <= 2025; decadeStart += 10) {
    const pts = allPoints.filter((p) => p.year >= decadeStart && p.year < decadeStart + 10);
    if (pts.length < 10) continue;
    const r = regress(pts);
    console.log(`  ${decadeStart}s: scale=${r.scale.toFixed(4)} R²=${r.rSquared.toFixed(4)} n=${r.n}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
