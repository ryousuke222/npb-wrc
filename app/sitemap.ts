import type { MetadataRoute } from "next";
import { getAvailableYears, getYearData } from "@/lib/data";

// 実際のデプロイ先ドメインで環境変数を設定すること（未設定時のプレースホルダーのままでは
// sitemap上のURLが正しくならない）
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const years = await getAvailableYears();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/all-time`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/team-best-nine`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/park-factors`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/team-wrc`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/compare`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/search`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
  ];

  const yearEntries: MetadataRoute.Sitemap = years.map((year) => ({
    url: `${SITE_URL}/year/${year}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const playerEntries: MetadataRoute.Sitemap = [];
  for (const year of years) {
    const data = await getYearData(year);
    if (!data) continue;
    for (const b of data.batters) {
      if (!b.qualified) continue; // 静的生成される規定打席到達者のみ（generateStaticParamsと揃える）
      playerEntries.push({
        url: `${SITE_URL}/year/${year}/${b.rank}`,
        changeFrequency: "monthly",
        priority: 0.3,
      });
    }
  }

  return [...staticEntries, ...yearEntries, ...playerEntries];
}
