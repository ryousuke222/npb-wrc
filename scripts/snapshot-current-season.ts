import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { YearData } from "../lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

async function main() {
  const years = JSON.parse(await readFile(path.join(DATA_DIR, "years.json"), "utf-8")) as number[];
  const year = years[0];
  const data = JSON.parse(await readFile(path.join(DATA_DIR, `${year}.json`), "utf-8")) as YearData;
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(data.generatedAt));
  const directory = path.join(DATA_DIR, "snapshots", String(year));
  const destination = path.join(directory, `${date}.json`);

  await mkdir(directory, { recursive: true });
  await writeFile(destination, JSON.stringify(data), "utf-8");
  console.log(`saved ${path.relative(process.cwd(), destination)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
