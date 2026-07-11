/**
 * OG画像（app/**\/opengraph-image.tsx）で使う固定文言。
 * ここに新しい文言を追加した場合は `npm run build-og-font` を再実行し、
 * サブセットフォント（assets/fonts/）に文字を追加する必要がある。
 */
export const OG_TEMPLATE_STRINGS = [
  "NPB最強打者ランキング",
  "wRC+",
  "位",
  "年",
  "セ・リーグ",
  "パ・リーグ",
  "規定打席内",
  "参考記録",
  "打率",
  "本塁打",
  "本",
  "／",
];

/** 数字・記号・全角/半角スペースなど、データに依存しない基本文字 */
export const OG_BASE_CHARS = "0123456789.,-+　 ";
