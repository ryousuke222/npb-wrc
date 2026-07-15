import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { CompareBatterRow, CompareIndex } from "@/lib/compare";
import { teamColor } from "@/lib/teamColors";

export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

type ShareBatter = {
  year: number;
  rank: number;
  name: string;
  teamId: CompareBatterRow[3];
  teamName: string;
  qualified: boolean;
  wrcPlus: number;
  ops: number;
  hr: number;
};

let dataPromise: Promise<CompareIndex> | undefined;
let fontPromise: Promise<[ArrayBuffer, ArrayBuffer]> | undefined;

function loadData(): Promise<CompareIndex> {
  dataPromise ??= readFile(
    path.join(process.cwd(), "public", "compare-index.json"),
    "utf-8"
  ).then((data) => JSON.parse(data) as CompareIndex);
  return dataPromise;
}

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

function toShareBatter(row: CompareBatterRow): ShareBatter {
  const [year, rank, name, teamId, teamName, , qualified, wrcPlus, , , , , , , ops, hr] = row;
  return { year, rank, name, teamId, teamName, qualified, wrcPlus, ops, hr };
}

function fmtRate(value: number): string {
  return value.toFixed(3).replace(/^0\./, ".");
}

export async function GET(request: Request) {
  const ids = [...new Set(new URL(request.url).searchParams.get("players")?.split(",") ?? [])]
    .filter((id) => /^\d{4}-\d+$/.test(id))
    .slice(0, 3);

  if (ids.length < 2) {
    return new Response("比較する2シーズンを指定してください。", { status: 400 });
  }

  const [index, [regular, bold]] = await Promise.all([loadData(), loadFonts()]);
  const rowsById = new Map(
    index.rows.map((row) => [`${row[0]}-${row[1]}`, row])
  );
  const batters = ids
    .map((id) => rowsById.get(id))
    .filter((row): row is CompareBatterRow => row !== undefined)
    .map(toShareBatter);

  if (batters.length < 2) {
    return new Response("比較データが見つかりません。", { status: 404 });
  }

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
          padding: "54px 64px 48px",
          fontFamily: "NotoSansJP",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#dc2626" }}>
            NPB最強打者ランキング
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#71717a" }}>wRC+ シーズン比較</div>
        </div>

        <div style={{ display: "flex", marginTop: 28, fontSize: 46, fontWeight: 700 }}>
          同じ土俵で、打撃を比べる。
        </div>

        <div style={{ display: "flex", flex: 1, gap: 20, marginTop: 28 }}>
          {batters.map((batter) => {
            const color = teamColor(batter.teamId);
            return (
              <div
                key={`${batter.year}-${batter.rank}`}
                style={{
                  display: "flex",
                  flex: 1,
                  flexDirection: "column",
                  border: "1px solid #e4e4e7",
                  borderTop: `8px solid ${color.bg}`,
                  borderRadius: 20,
                  background: "#ffffff",
                  padding: "26px 28px",
                }}
              >
                <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "#71717a" }}>
                  {batter.year}年
                </div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 42, fontWeight: 700 }}>
                  {batter.name}
                </div>
                <div style={{ display: "flex", marginTop: 8, fontSize: 22, color: color.bg }}>
                  {batter.teamName} ・ {batter.qualified ? "規定到達" : "規定未満"}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", marginTop: "auto" }}>
                  <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#dc2626" }}>
                    {Math.round(batter.wrcPlus)}
                  </div>
                  <div style={{ display: "flex", marginLeft: 10, fontSize: 22, fontWeight: 700, color: "#71717a" }}>
                    wRC+
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 23, color: "#52525b" }}>
                  <span style={{ display: "flex" }}>OPS {fmtRate(batter.ops)}</span>
                  <span style={{ display: "flex" }}>{batter.hr}本塁打</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", marginTop: 24, fontSize: 20, color: "#71717a" }}>
          球場・リーグの違いを補正したwRC+で比較　|　npb-wrc.vercel.app
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
