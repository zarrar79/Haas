import { haasGet, haasListPage, haasSend } from "@/lib/haas-api";
import type { Hackathon, HackathonWriteInput } from "@/types/hackathon";

export async function listHackathons(filters?: {
  search?: string;
  is_active?: string;
  show_deleted?: string;
}) {
  return haasListPage<Hackathon>("hackathons", filters);
}

export function getHackathon(id: string) {
  return haasGet<Hackathon>(`hackathons/${id}`);
}

export function createHackathon(body: HackathonWriteInput) {
  return haasSend<Hackathon>("hackathons", { method: "POST", body });
}

export function updateHackathon(id: string, body: Partial<HackathonWriteInput>) {
  return haasSend<Hackathon>(`hackathons/${id}`, { method: "PATCH", body });
}

export function archiveHackathon(id: string) {
  return haasSend<unknown>(`hackathons/${id}/archive`, { method: "POST" });
}

export function restoreHackathon(id: string) {
  return haasSend<unknown>(`hackathons/${id}/restore`, { method: "POST" });
}

export function breakGlassHackathon(id: string, reason: string) {
  return haasSend<unknown>(`hackathons/${id}/break-glass`, {
    method: "POST",
    body: { reason },
  });
}

export type HackathonAnalytics = {
  teams?: number;
  members?: number;
  challenges?: number;
  active_machines?: number;
  submissions?: number;
  total_score?: number;
};

export function getHackathonAnalytics(id: string) {
  return haasGet<HackathonAnalytics>(`hackathons/${id}/analytics`);
}
