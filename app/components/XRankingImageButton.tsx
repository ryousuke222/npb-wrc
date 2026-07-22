"use client";

import type { TeamWrc } from "@/lib/wrc";
import { teamColor } from "@/lib/teamColors";

export default function XRankingImageButton({ year, teams }: { year: number; teams: TeamWrc[] }) {
  const createImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#fafafa";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#18181b";
    context.font = "700 56px Arial, sans-serif";
    context.fillText(`${year}年 チームwRC+ランキング`, 72, 110);
    context.fillStyle = "#71717a";
    context.font = "500 28px Arial, sans-serif";
    context.fillText("リーグ平均100 / NPB最強打者ランキング", 72, 158);

    teams.slice(0, 10).forEach((team, index) => {
      const top = 210 + index * 100;
      const color = teamColor(team.teamId);
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#e4e4e7";
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(72, top, 936, 78, 16);
      context.fill();
      context.stroke();
      context.fillStyle = color.bg;
      context.fillRect(72, top, 12, 78);
      context.fillStyle = "#a1a1aa";
      context.font = "700 30px Arial, sans-serif";
      context.fillText(String(index + 1), 112, top + 49);
      context.fillStyle = "#27272a";
      context.font = "700 34px Arial, sans-serif";
      context.fillText(team.teamName, 182, top + 49);
      context.textAlign = "right";
      context.font = "700 42px Arial, sans-serif";
      context.fillText(String(Math.round(team.wrcPlus)), 952, top + 52);
      context.textAlign = "left";
    });

    context.fillStyle = "#71717a";
    context.font = "500 24px Arial, sans-serif";
    context.fillText("https://npb-wrc.vercel.app/latest", 72, 1265);
    const link = document.createElement("a");
    link.download = `npb-team-wrc-${year}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <button
      type="button"
      onClick={createImage}
      className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-700"
    >
      X投稿用画像を保存
    </button>
  );
}
