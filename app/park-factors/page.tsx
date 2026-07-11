import { getAllParkFactors, getAvailableYears } from "@/lib/data";
import {
  ALL_TEAM_IDS,
  HISTORICAL_ONLY_TEAM_IDS,
  TEAM_ID_DEFAULT_NAME,
  type TeamId,
} from "@/lib/teams";
import { teamColor } from "@/lib/teamColors";

// 現行12球団に加え、近鉄・大映のように現在は消滅している歴史上のみの球団も表示する
const DISPLAY_TEAM_IDS: TeamId[] = [...ALL_TEAM_IDS, ...HISTORICAL_ONLY_TEAM_IDS];

export const metadata = {
  title: "パークファクター一覧（診断用） | NPB最強打者ランキング",
  description:
    "年度・球団別のパークファクター算出値を一覧表示する診断用ページ。異常値の確認に使用します。",
};

function cellBg(raw: number): string {
  // 1.0を中心に、高いほど赤系・低いほど青系の背景色をつける
  const diff = raw - 1;
  const clamped = Math.max(-0.35, Math.min(0.35, diff));
  const alpha = Math.abs(clamped) / 0.35;
  if (clamped >= 0) {
    return `rgba(220, 38, 38, ${(alpha * 0.35).toFixed(2)})`;
  }
  return `rgba(37, 99, 235, ${(alpha * 0.35).toFixed(2)})`;
}

export default async function ParkFactorsPage() {
  const [entries, years] = await Promise.all([
    getAllParkFactors(),
    getAvailableYears(),
  ]);
  const sortedYears = [...years].sort((a, b) => a - b);

  const byYearTeam = new Map<string, (typeof entries)[number]>();
  for (const e of entries) byYearTeam.set(`${e.year}-${e.teamId}`, e);

  // 球団ごとの平均raw値（自チームの過去平均から大きく外れる年度を検出するため）
  const teamAverages = new Map<TeamId, number>();
  for (const teamId of DISPLAY_TEAM_IDS) {
    const vals = entries.filter((e) => e.teamId === teamId).map((e) => e.raw);
    if (vals.length > 0) {
      teamAverages.set(teamId, vals.reduce((s, v) => s + v, 0) / vals.length);
    }
  }

  const OUTLIER_THRESHOLD = 0.15;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        パークファクター一覧（診断用）
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        年度・球団ごとの素のパークファクター（球団ごとに最大5年を加重プール＋サンプル年数に応じた信頼度で1.0側へ回帰。
        本拠地移転・球場改修があった球団は変化年からの前方窓に切り替え）。
        セルにマウスを乗せると本拠地/ビジターの試合数・サンプル年数・信頼度を確認できます。
        <span className="ml-1 font-bold text-amber-600">黄色の枠</span>
        は、その球団の全年度平均から±{OUTLIER_THRESHOLD}以上ズレている値です。
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 text-left font-bold text-zinc-500">
                年度
              </th>
              {DISPLAY_TEAM_IDS.map((teamId) => {
                const color = teamColor(teamId);
                return (
                  <th
                    key={teamId}
                    className="px-2 py-2 text-center text-xs font-bold whitespace-nowrap"
                    style={{ color: color.bg }}
                  >
                    {TEAM_ID_DEFAULT_NAME[teamId]}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedYears.map((year) => (
              <tr key={year} className="border-t border-zinc-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-bold text-zinc-700">
                  {year}
                </td>
                {DISPLAY_TEAM_IDS.map((teamId) => {
                  const e = byYearTeam.get(`${year}-${teamId}`);
                  if (!e) {
                    return (
                      <td
                        key={teamId}
                        className="px-2 py-1.5 text-center text-zinc-300"
                      >
                        —
                      </td>
                    );
                  }
                  const avg = teamAverages.get(teamId) ?? e.raw;
                  const isOutlier = Math.abs(e.raw - avg) >= OUTLIER_THRESHOLD;
                  return (
                    <td
                      key={teamId}
                      title={`本拠地${e.homeGames}試合 / ビジター${e.awayGames}試合 / 補正後${e.adjusted.toFixed(3)} / サンプル${e.sampleYears}年・信頼度${e.confidence.toFixed(1)}`}
                      style={{
                        backgroundColor: cellBg(e.raw),
                        outline: isOutlier ? "2px solid #f59e0b" : undefined,
                        outlineOffset: isOutlier ? "-2px" : undefined,
                      }}
                      className={`px-2 py-1.5 text-center tabular-nums ${
                        isOutlier ? "font-bold" : ""
                      }`}
                    >
                      {e.raw.toFixed(3)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-zinc-400">
        球団ごとの全年度平均:{" "}
        {DISPLAY_TEAM_IDS.map((teamId) => (
          <span key={teamId} className="mr-3 inline-block whitespace-nowrap">
            {TEAM_ID_DEFAULT_NAME[teamId]}=
            {(teamAverages.get(teamId) ?? 0).toFixed(3)}
          </span>
        ))}
      </div>
    </div>
  );
}
