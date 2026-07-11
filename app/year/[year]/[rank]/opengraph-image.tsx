import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getAvailableYears, getYearData } from "@/lib/data";
import { teamColor, withAlpha } from "@/lib/teamColors";
import { fmtWrcPlus } from "@/lib/wrc";

export const alt = "選手の年度別wRC+成績";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 規定打席到達者のみビルド時に静的生成する（page.tsxのgenerateStaticParamsと同じ方針）。
export async function generateStaticParams() {
  const years = await getAvailableYears();
  const params: { year: string; rank: string }[] = [];
  for (const year of years) {
    const data = await getYearData(year);
    if (!data) continue;
    for (const b of data.batters) {
      if (!b.qualified) continue;
      params.push({ year: String(year), rank: String(b.rank) });
    }
  }
  return params;
}

function fmtRate(n: number): string {
  return n.toFixed(3).replace(/^0\./, ".");
}

function wrcTextColor(v: number): string {
  if (v >= 160) return "#dc2626";
  if (v >= 130) return "#ea580c";
  if (v >= 100) return "#18181b";
  return "#71717a";
}

export default async function Image({
  params,
}: {
  params: Promise<{ year: string; rank: string }>;
}) {
  const { year: yearParam, rank: rankParam } = await params;
  const year = Number(yearParam);
  const rank = Number(rankParam);
  const data = await getYearData(year);
  const batter = data?.batters.find((b) => b.rank === rank);

  const bold = await readFile(
    path.join(process.cwd(), "assets/fonts/notosans-jp-og-bold.ttf")
  );

  if (!batter) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fafafa",
            fontSize: 56,
            fontWeight: 700,
            color: "#18181b",
          }}
        >
          NPB最強打者ランキング
        </div>
      ),
      { ...size, fonts: [{ name: "NotoSansJP", data: bold, style: "normal", weight: 700 }] }
    );
  }

  const color = teamColor(batter.teamId);
  const leagueLabel = batter.league === "central" ? "セ・リーグ" : "パ・リーグ";
  const rankLabel =
    batter.leagueRank !== null ? `規定打席内 ${batter.leagueRank}位` : "参考記録";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          borderTop: `14px solid ${color.bg}`,
          padding: "56px 72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#a1a1aa" }}>
          NPB最強打者ランキング
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#71717a" }}>
              {`${year}年 ${leagueLabel} ${rankLabel}`}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 84,
                fontWeight: 700,
                color: "#18181b",
                marginTop: 12,
                letterSpacing: -1,
              }}
            >
              {batter.name}
            </div>
            <div style={{ display: "flex", marginTop: 20 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  fontWeight: 700,
                  color: color.bg,
                  background: withAlpha(color.bg, 0.14),
                  borderRadius: 9999,
                  padding: "8px 28px",
                }}
              >
                {batter.teamName}
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 40, fontSize: 32, color: "#52525b" }}>
              {`打率 ${fmtRate(batter.avg)} ／ 本塁打 ${batter.hr}本`}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 190,
                fontWeight: 700,
                color: wrcTextColor(batter.wrcPlus),
                letterSpacing: -4,
                lineHeight: 1,
              }}
            >
              {fmtWrcPlus(batter.wrcPlus)}
            </div>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#a1a1aa" }}>
              wRC+
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NotoSansJP", data: bold, style: "normal", weight: 700 }],
    }
  );
}
