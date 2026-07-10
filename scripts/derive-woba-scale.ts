/**
 * wOBAスケール定数を、実際のNPBデータから経験的に導出するスクリプト。
 *
 * これまでMLBで一般的に使われる固定値（1.15）を借用していたが、NPBは
 * MLBよりも得点環境が低く（投手の打席が多い等）、そのまま流用すると
 * wRC+の振れ幅が実態より大きくなってしまう問題があった。
 *
 * ここでは「チームのwOBA（当サイトの簡易係数で算出）とリーグ平均との差」が
 * 「チームの実際の得点/打席とリーグ平均との差」をどれだけ説明するかを
 * 2005〜現在の全年度・全球団（.cache/raw に保存済みのチーム打撃成績ページ）
 * から回帰分析し、原点を通る最小二乗法でスケール定数を求める。
 *
 * 実行: npx tsx scripts/derive-woba-scale.ts
 * 出力された値は lib/wrc.ts の WOBA_SCALE に手動で反映する
 * （ビルド時にブラウザ側へfsアクセスがバンドルされるのを避けるため、
 * 動的読み込みではなくハードコードする方針）。
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseTeamBattingRows, sumTeamBattingRows } from "../lib/npbParse";
import { calcWoba } from "../lib/wrc";

const CACHE_DIR = path.join(process.cwd(), ".cache", "raw");
const DATA_DIR = path.join(process.cwd(), "data");

async function main() {
  const years = JSON.parse(
    await readFile(path.join(DATA_DIR, "years.json"), "utf-8")
  ) as number[];

  let sumX2 = 0;
  let sumXY = 0;
  const points: { x: number; y: number }[] = [];

  for (const year of years) {
    for (const lp of ["c", "p"]) {
      const file = path.join(CACHE_DIR, `${year}-tmb-${lp}.html`);
      const html = await readFile(file, "utf-8").catch(() => null);
      if (!html) continue;

      const teams = parseTeamBattingRows(html);
      if (teams.length === 0) continue;
      const totals = sumTeamBattingRows(teams);
      if (totals.pa === 0) continue;

      const lgWoba = calcWoba(totals);
      const lgRunsPerPa = totals.runs / totals.pa;

      for (const t of teams) {
        if (t.pa === 0) continue;
        const x = calcWoba(t) - lgWoba; // wOBAの差
        const y = t.runs / t.pa - lgRunsPerPa; // 実際の得点/打席の差
        sumX2 += x * x;
        sumXY += x * y;
        points.push({ x, y });
      }
    }
  }

  const scale = sumX2 / sumXY;

  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const pred = p.x / scale;
    ssRes += (p.y - pred) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const rSquared = 1 - ssRes / ssTot;

  console.log(`サンプル数（チーム×年度）: ${points.length}`);
  console.log(`導出されたWOBA_SCALE: ${scale.toFixed(4)}`);
  console.log(`決定係数 R^2: ${rSquared.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
