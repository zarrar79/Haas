import { callAppApi } from "@/lib/client-api";
import { asList, unwrapHaasResult, type HaasForwardPayload } from "@/lib/haas-api";
import type { ApiResult } from "@/types";
import type { Hackathon, HackathonWriteInput } from "@/types/hackathon";

function haasPath(path: string, query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function listHackathons(filters?: {
  search?: string;
  is_active?: string;
  show_deleted?: string;
}) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasPath("/api/haas/hackathons/", filters),
  );
  const unwrapped = unwrapHaasResult(result);
  return {
    items: asList<Hackathon>(unwrapped.data),
    pagination: unwrapped.pagination,
    message: unwrapped.message,
  };
}

export async function getHackathon(id: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<Hackathon>>>(
    `/api/haas/hackathons/${id}/`,
  );
  return unwrapHaasResult(result).data;
}

export async function createHackathon(body: HackathonWriteInput) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<Hackathon>>>(
    "/api/haas/hackathons/",
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateHackathon(
  id: string,
  body: Partial<HackathonWriteInput>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<Hackathon>>>(
    `/api/haas/hackathons/${id}/`,
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function archiveHackathon(id: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    `/api/haas/hackathons/${id}/archive/`,
    { method: "POST" },
  );
  return unwrapHaasResult(result);
}

export async function restoreHackathon(id: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    `/api/haas/hackathons/${id}/restore/`,
    { method: "POST" },
  );
  return unwrapHaasResult(result);
}

export async function breakGlassHackathon(id: string, reason: string) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    `/api/haas/hackathons/${id}/break-glass/`,
    { method: "POST", body: { reason } },
  );
  return unwrapHaasResult(result);
}

export type HackathonAnalytics = {
  teams?: number;
  members?: number;
  challenges?: number;
  active_machines?: number;
  submissions?: number;
  total_score?: number;
};

export async function getHackathonAnalytics(id: string) {
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<HackathonAnalytics>>
  >(`/api/haas/hackathons/${id}/analytics/`);
  return unwrapHaasResult(result).data;
}
