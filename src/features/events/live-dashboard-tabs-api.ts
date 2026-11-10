import { haasGet, haasSend } from "@/lib/haas-api";

export type LiveDashboardTab = {
  name: string;
  label: string;
  group: "navigation" | "overview_cards" | string;
  is_enabled: boolean;
  isEnabled?: boolean;
};

export type LiveDashboardTabsPayload = {
  hackathon_id: string;
  view_on_dashboard: boolean;
  tabs: LiveDashboardTab[];
};

function path(hackathonId: string) {
  return `hackathons/${hackathonId}/live-dashboard-tabs`;
}

export function getLiveDashboardTabs(hackathonId: string) {
  return haasGet<LiveDashboardTabsPayload>(path(hackathonId));
}

export function patchLiveDashboardTabs(
  hackathonId: string,
  body: {
    view_on_dashboard?: boolean;
    tabs?: Array<{ name: string; is_enabled: boolean }>;
  },
) {
  return haasSend<LiveDashboardTabsPayload>(path(hackathonId), {
    method: "PATCH",
    body,
  });
}
