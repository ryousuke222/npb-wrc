import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ALL_TEAM_IDS, HISTORICAL_ONLY_TEAM_IDS } from "../lib/teams";
import type { BatterRanking, YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const TEAM_IDS = new Set<string>([...ALL_TEAM_IDS, ...HISTORICAL_ONLY_TEAM_IDS]);
const COUNTING_FIELDS = [
  "games", "pa", "ab", "runs", "hits", "doubles", "triples", "hr",
  "totalBases", "rbi", "sb", "cs", "sh", "sf", "bb", "ibb", "hbp", "so", "gdp",
] as const satisfies readonly (keyof BatterRanking)[];
const RATE_FIELDS = ["avg", "slg", "obp", "ops", "woba", "wrcPlus"] as const satisfies readonly (keyof BatterRanking)[];

type Issue = { file: string; message: string };

function pushIf(condition: boolean, issues: Issue[], file: string, message: string) {
  if (condition) issues.push({ file, message });
}

function validateBatter(
  batter: BatterRanking,
  file: string,
  seenRanks: Set<number>,
  errors: Issue[]
) {
  const label = `${batter.name || "名称不明"} (rank:${batter.rank})`;
  pushIf(!Number.isInteger(batter.rank) || batter.rank < 1, errors, file, `${label}: rankが不正です`);
  pushIf(seenRanks.has(batter.rank), errors, file, `rank ${batter.rank} が重複しています`);
  seenRanks.add(batter.rank);
  pushIf(!batter.name?.trim(), errors, file, `rank ${batter.rank}: 選手名がありません`);
  pushIf(!TEAM_IDS.has(batter.teamId), errors, file, `${label}: 未知のteamId ${batter.teamId}`);
  pushIf(batter.league !== "central" && batter.league !== "pacific", errors, file, `${label}: leagueが不正です`);

  for (const field of COUNTING_FIELDS) {
    const value = batter[field];
    pushIf(typeof value !== "number" || !Number.isFinite(value) || value < 0, errors, file, `${label}: ${field}が不正です`);
  }
  for (const field of RATE_FIELDS) {
    const value = batter[field];
    pushIf(typeof value !== "number" || !Number.isFinite(value), errors, file, `${label}: ${field}が不正です`);
  }

  if (batter.ab > 0) {
    pushIf(Math.abs(batter.avg - batter.hits / batter.ab) > 0.002, errors, file, `${label}: 打率と安打/打数が一致しません`);
  }
  pushIf(Math.abs(batter.ops - (batter.obp + batter.slg)) > 0.002, errors, file, `${label}: OPSと出塁率+長打率が一致しません`);
  pushIf(batter.qualified && batter.leagueRank === null, errors, file, `${label}: 規定到達者にリーグ順位がありません`);
  pushIf(!batter.qualified && batter.leagueRank !== null, errors, file, `${label}: 規定未到達者にリーグ順位があります`);
}

async function main() {
  const filenames = (await readdir(DATA_DIR))
    .filter((name) => /^\d{4}\.json$/.test(name))
    .sort();
  const errors: Issue[] = [];
  let batterCount = 0;
  let missingAge = 0;
  let missingBats = 0;
  let missingPosition = 0;
  let latest: YearData | null = null;

  for (const filename of filenames) {
    const file = path.join(DATA_DIR, filename);
    const data = JSON.parse(await readFile(file, "utf-8")) as YearData;
    const year = Number(filename.slice(0, 4));
    pushIf(data.year !== year, errors, filename, `ファイル名とyearが一致しません (${data.year})`);
    pushIf(!Number.isFinite(new Date(data.generatedAt).getTime()), errors, filename, "generatedAtが不正です");
    pushIf(!Array.isArray(data.batters) || data.batters.length === 0, errors, filename, "打者データが空です");
    pushIf(!Number.isFinite(data.regulationPaThreshold) || data.regulationPaThreshold < 0, errors, filename, "規定打席値が不正です");

    const seenRanks = new Set<number>();
    for (const batter of data.batters) {
      validateBatter(batter, filename, seenRanks, errors);
      batterCount += 1;
      if (batter.age === undefined) missingAge += 1;
      if (!batter.bats) missingBats += 1;
      if (!batter.position) missingPosition += 1;
    }
    if (!latest || data.year > latest.year) latest = data;
  }

  if (latest && !latest.seasonComplete) {
    const ageHours = (Date.now() - new Date(latest.generatedAt).getTime()) / 3_600_000;
    pushIf(ageHours > 48, errors, `${latest.year}.json`, `進行中シーズンの更新が${Math.floor(ageHours)}時間止まっています`);
    pushIf(ageHours < -24, errors, `${latest.year}.json`, "generatedAtが24時間以上未来です");
  }

  console.log(`Validated ${filenames.length} seasons / ${batterCount.toLocaleString("ja-JP")} batter rows.`);
  console.log(`Coverage gaps: age ${missingAge}, bats ${missingBats}, position ${missingPosition}.`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} data validation error(s):`);
    for (const issue of errors.slice(0, 100)) console.error(`- ${issue.file}: ${issue.message}`);
    if (errors.length > 100) console.error(`- ...and ${errors.length - 100} more`);
    process.exitCode = 1;
  } else {
    console.log("Data validation passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
