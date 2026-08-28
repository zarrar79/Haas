import type { IconType } from "react-icons";
import { BiFlag, BiLayer, BiShield, BiSolidZap } from "react-icons/bi";

const TEAM_TYPE_STYLES: Record<
  string,
  { icon: IconType; iconClass: string; pillClass: string }
> = {
  red: {
    icon: BiFlag,
    iconClass: "text-red-500",
    pillClass: "bg-red-500/15 text-red-400",
  },
  blue: {
    icon: BiShield,
    iconClass: "text-blue-500",
    pillClass: "bg-blue-500/15 text-blue-400",
  },
  purple: {
    icon: BiSolidZap,
    iconClass: "text-purple-500",
    pillClass: "bg-purple-500/15 text-purple-400",
  },
  mix: {
    icon: BiLayer,
    iconClass: "text-amber-500",
    pillClass: "bg-amber-500/15 text-amber-400",
  },
};

export function parseTeamTypeLabel(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parseTeamTypeLabel(parsed);
    } catch {
      return trimmed;
    }
  }

  if (typeof value === "object" && "type" in value) {
    const typeValue = (value as { type?: unknown }).type;
    if (typeValue == null || typeValue === "") return null;
    return String(typeValue);
  }

  return null;
}

export function TeamTypeDisplay({ teamType }: { teamType: unknown }) {
  const label = parseTeamTypeLabel(teamType);
  if (!label) return <span className="text-sm text-[var(--text-muted)]">—</span>;

  const key = label.toLowerCase();
  const style =
    TEAM_TYPE_STYLES[key] ?? {
      icon: BiLayer,
      iconClass: "text-[var(--text-muted)]",
      pillClass: "bg-[var(--surface-raised)] text-[var(--text)]",
    };
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${style.pillClass}`}
    >
      <Icon className={`text-base ${style.iconClass}`} aria-hidden />
      {label}
    </span>
  );
}
