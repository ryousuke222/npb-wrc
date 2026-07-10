import { redirect } from "next/navigation";
import { getLatestYear } from "@/lib/data";

export default async function Home() {
  const latestYear = await getLatestYear();
  redirect(`/year/${latestYear}`);
}
