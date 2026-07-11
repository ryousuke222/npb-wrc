import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "NPB最強打者ランキング (wRC+)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const bold = await readFile(
    path.join(process.cwd(), "assets/fonts/notosans-jp-og-bold.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 9999,
            background: "#ffffff",
            border: "5px solid #18181b",
            marginBottom: 36,
          }}
        >
          <div style={{ fontSize: 64, color: "#dc2626", fontWeight: 700 }}>
            wRC+
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: "#18181b",
            letterSpacing: -1,
          }}
        >
          NPB最強打者ランキング
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 32,
            color: "#71717a",
          }}
        >
          wRC+で見る、NPB年度別・歴代の最強打者たち
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NotoSansJP", data: bold, style: "normal", weight: 700 }],
    }
  );
}
