import type { IconType } from "react-icons";
import {
  BiBarChart,
  BiBook,
  BiBriefcase,
  BiCalendarEvent,
  BiClipboard,
  BiCog,
  BiCollection,
  BiFlag,
  BiGridAlt,
  BiGroup,
  BiHome,
  BiListUl,
  BiMessage,
  BiMicrochip,
  BiPlusCircle,
  BiPulse,
  BiShield,
  BiSlider,
  BiSolidZap,
  BiStar,
  BiTrendingUp,
  BiTrophy,
  BiUser,
} from "react-icons/bi";

export const NAV_ICONS = {
  overview: BiGridAlt,
  hackathons: BiCalendarEvent,
  challenges: BiFlag,
  teams: BiGroup,
  catalog: BiCollection,
  system: BiCog,
  event: BiBriefcase,
  brand: BiStar,
  "hackathons-list": BiListUl,
  "hackathons-new": BiPlusCircle,
  "event-home": BiHome,
  "event-members": BiUser,
  "event-teams": BiGroup,
  "event-challenges": BiTrophy,
  "event-question-answers": BiMessage,
  "event-scores": BiBarChart,
  "event-machines": BiMicrochip,
  "event-activity-logs": BiBook,
  "event-settings": BiSlider,
  "event-ops": BiSolidZap,
  "system-stats": BiTrendingUp,
  "system-users": BiUser,
  "system-admins": BiShield,
  "system-audit": BiClipboard,
  "system-activity": BiPulse,
  "system-groups": BiCollection,
} as const satisfies Record<string, IconType>;

export type NavIconName = keyof typeof NAV_ICONS;

export function NavIcon({
  name,
  className = "",
}: {
  name: NavIconName;
  className?: string;
}) {
  const Icon = NAV_ICONS[name];
  return <Icon className={className} aria-hidden />;
}
