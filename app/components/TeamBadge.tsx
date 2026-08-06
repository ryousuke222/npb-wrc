import { readableOnLight, teamColor, withAlpha } from "@/lib/teamColors";
import type { TeamId } from "@/lib/teams";

export default function TeamBadge({
  teamId,
  name,
  size = "xs",
  className = "",
}: {
  teamId: TeamId | null;
  name: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  const color = teamColor(teamId);

  return (
    <span
      style={{
        backgroundColor: withAlpha(color.bg, 0.16),
        color: readableOnLight(color.bg),
        boxShadow: `inset 3px 0 0 ${color.bg}`,
      }}
      className={`inline-flex items-center rounded-full font-bold whitespace-nowrap ${
        size === "sm" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-[10px]"
      } ${className}`}
    >
      {name}
    </span>
  );
}
