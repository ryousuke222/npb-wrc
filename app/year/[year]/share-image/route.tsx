import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getYearData } from "@/lib/data";
import { formatGeneratedAtJa } from "@/lib/date";
import { teamColor } from "@/lib/teamColors";

export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

let fontPromise: Promise<[ArrayBuffer, ArrayBuffer]> | undefined;

function loadFonts(): Promise<[ArrayBuffer, ArrayBuffer]> {
  fontPromise ??= Promise.all([
    readFile(path.join(process.cwd(), "assets/fonts/notosans-jp-og-regular.ttf")),
    readFile(path.join(process.cwd(), "assets/fonts/notosans-jp-og-bold.ttf")),
  ]).then(([regular, bold]) => [
    regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength),
    bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength),
  ]);
  return fontPromise;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year)) return new Response("年度が不正です。", { status: 400 });

  const [data, [regular, bold]] = await Promise.all([getYearData(year), loadFonts()]);
  if (!data) return new Response("年度データが見つかりません。", { status: 404 });

  const leaders = data.batters
    .filter((batter) => batter.pa >= data.regulationPaThreshold)
    .sort((a, b) => b.wrcPlus - a.wrcPlus)
    .slice(0, 5);
  const updatedAt = formatGeneratedAtJa(data.generatedAt);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fafafa",
          color: "#18181b",
          padding: "46px 60px 38px",
          fontFamily: "NotoSansJP",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#dc2626" }}>
            NPB最強打者ランキング
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#71717a" }}>wRC+（規定打席到達者）</div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", marginTop: 14 }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>{year}年 現時点の最強打者</div>
          <div style={{ display: "flex", marginLeft: 18, fontSize: 26, color: "#71717a" }}>TOP 5</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
          {leaders.map((batter, index) => {
            const color = teamColor(batter.teamId);
            return (
              <div
                key={`${batter.name}-${batter.teamId}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: 66,
                  border: "1px solid #e4e4e7",
                  borderLeft: `8px solid ${color.bg}`,
                  borderRadius: 14,
                  background: "#ffffff",
                  padding: "0 24px",
                }}
              >
                <div style={{ display: "flex", width: 58, fontSize: 28, fontWeight: 700, color: "#71717a" }}>
                  {index + 1}
                </div>
                <div style={{ display: "flex", width: 260, fontSize: 30, fontWeight: 700 }}>
                  {batter.name}
                </div>
                <div style={{ display: "flex", flex: 1, fontSize: 21, color: color.bg }}>
                  {batter.teamName}
                </div>
                <div style={{ display: "flex", alignItems: "baseline" }}>
                  <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#dc2626" }}>
                    {Math.round(batter.wrcPlus)}
                  </div>
                  <div style={{ display: "flex", marginLeft: 8, fontSize: 18, fontWeight: 700, color: "#71717a" }}>
                    wRC+
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 19, color: "#71717a" }}>
          {updatedAt ? `最終更新：${updatedAt}（日本時間）` : "2026年シーズン途中の暫定値"}
          {!data.seasonComplete ? " ・ シーズン途中の暫定値" : ""}
          <span style={{ display: "flex", marginLeft: "auto" }}>npb-wrc.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "NotoSansJP", data: regular, style: "normal", weight: 400 },
        { name: "NotoSansJP", data: bold, style: "normal", weight: 700 },
      ],
    }
  );
}
