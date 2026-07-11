/**
 * OG画像生成（app/**\/opengraph-image.tsx）用の日本語サブセットフォントを作る。
 *
 * next/og(ImageResponse)はデフォルトでCJKグリフを持たないため、選手名・球団名を
 * 描画するには日本語フォントを埋め込む必要がある。しかしNoto Sans JPのフル版は
 * 数MB〜10MB近くあり、ImageResponseのバンドルサイズ上限的にも同梱に適さない。
 * そこで「実際にサイト上で表示され得る文字」だけに絞ったサブセットフォントを
 * ビルド時に一度だけ生成し、assets/fonts/ にコミットして使い回す。
 *
 * 文字集合 = 全年度・全打者のname/teamName + lib/ogText.tsの固定文言。
 * 新しい選手が増えたり、OG画像に新しい文言を追加したりした場合はこのスクリプトを
 * 再実行して assets/fonts/ を更新する必要がある（毎回のビルドでは自動実行しない
 * ＝ネットワーク越しにフォント本体を取得するため）。
 *
 * 実行: npx tsx scripts/build-og-font.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import subsetFont from "subset-font";
import { getAvailableYears, getYearData } from "../lib/data";
import { TEAM_ID_DEFAULT_NAME } from "../lib/teams";
import { OG_BASE_CHARS, OG_TEMPLATE_STRINGS } from "../lib/ogText";

const FONT_SOURCE_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf";
const OUT_DIR = path.join(process.cwd(), "assets", "fonts");

async function collectChars(): Promise<string> {
  const chars = new Set<string>();
  for (const s of [...OG_TEMPLATE_STRINGS, OG_BASE_CHARS]) {
    for (const ch of s) chars.add(ch);
  }
  for (const name of Object.values(TEAM_ID_DEFAULT_NAME)) {
    for (const ch of name) chars.add(ch);
  }

  const years = await getAvailableYears();
  for (const year of years) {
    const data = await getYearData(year);
    if (!data) continue;
    for (const b of data.batters) {
      for (const ch of b.name) chars.add(ch);
      for (const ch of b.teamName) chars.add(ch);
    }
  }

  return [...chars].join("");
}

async function main() {
  console.log("文字集合を収集中...");
  const text = await collectChars();
  console.log(`ユニーク文字数: ${text.length}`);

  console.log("ベースフォント(Noto Sans JP)を取得中...");
  const res = await fetch(FONT_SOURCE_URL);
  if (!res.ok) throw new Error(`フォント取得に失敗: ${res.status}`);
  const baseFont = Buffer.from(await res.arrayBuffer());
  console.log(`ベースフォントサイズ: ${(baseFont.length / 1024 / 1024).toFixed(1)}MB`);

  await mkdir(OUT_DIR, { recursive: true });

  for (const [label, wght] of [
    ["regular", 400],
    ["bold", 700],
  ] as const) {
    console.log(`サブセット生成中 (weight=${wght})...`);
    const subset = await subsetFont(baseFont, text, {
      targetFormat: "sfnt",
      variationAxes: { wght },
    });
    const outPath = path.join(OUT_DIR, `notosans-jp-og-${label}.ttf`);
    await writeFile(outPath, subset);
    console.log(`書き出し: ${outPath} (${(subset.length / 1024).toFixed(0)}KB)`);
  }

  console.log("完了");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
